# Facturation électronique — Phase 1 (couche PA, sans réseau)

Adaptateur réel Super PDP : plus tard. Aujourd’hui `getEInvoicingProvider()` renvoie `MockProvider`.

## Architecture

- Une **application Flowo** (client_id/secret globaux, pas encore branchés).
- **OAuth2 authorization code par artisan** : jetons dans `einvoicing_oauth_tokens`, chiffrés AES-256-GCM. Chaque blob porte un `key_id` (`EINVOICING_TOKEN_ENCRYPTION_KEY_ID`, défaut `v1`).
- Jamais de `client_id` par entité fiscale.
- Ingestion unique : `ingestLifecycleEvents`. Le polling (`pollAndIngestLifecycleEvents`) est le seul appelant actuel. Un webhook futur parse puis appelle la même fonction, puis `dispatchCycleSignalNotifications` pour fr:207 / fr:211.
- Cron `GET /api/cron/einvoicing-poll` : uniquement `Authorization: Bearer $CRON_SECRET` (header Vercel Cron).

## Mapping régime TVA Flowo → Super PDP

| Flowo `regime_tva` | Super PDP `has_vat_on_debits` | Super PDP `vat_regime` |
|---|---|---|
| `encaissements` | `false` | périodicité (manquante) |
| `debits` | `true` | périodicité (manquante) |
| `franchise_293b` | `false` | `vat_exemption` (complet) |

`vat_regime` Super PDP n’est **pas** l’exigibilité : c’est la périodicité PPF (`monthly` \| `quarterly` \| `simplified` \| `vat_exemption`).

**Manque en base (et à l’UI entreprise) :** la périodicité mensuel / trimestriel / simplifié. Colonne nullable `profiles.tva_periodicite_declaration`. Tant qu’elle est vide, le mapping est `incomplete` hors franchise.

## Cycle de vie `statut_cycle_vie`

`brouillon → emise → deposee → rejetee | irrecevable | encaissee`

- `rejetee` (fr:210) : refus destinataire, **corrigeable** (`rejetee → deposee`).
- `irrecevable` (fr:213, fr:501) : rejet définitif, **terminal**.
- `encaissee` (fr:212) : terminal.
- `fr:207` (Contestée) et `fr:211` (Paiement émis) : **pas de transition**. Conservés dans `facture_cycle_events` (journal) et notifiés via le système artisan (`facture_contestee`, `facture_paiement_emis`, e-mail par défaut). Réglages : Compte → Notifications.

Source de vérité : `FR_LIFECYCLE_MAPPING` dans `lib/facturation/pa/cycle-machine.ts`.

| Code | Libellé AFNOR | Effet | Statut Flowo |
|---|---|---|---|
| fr:200 | Déposée | deposit | deposee |
| fr:201 | Transmise | deposit | deposee |
| fr:202 | Reçue | deposit | deposee |
| fr:203 | Mise à disposition | deposit | deposee |
| fr:204 | Prise en charge | deposit | deposee |
| fr:205 | Approuvée | deposit | deposee |
| fr:206 | Approuvée partiellement | deposit | deposee |
| fr:207 | Contestée | none | inchangé |
| fr:208 | En suspens | none | inchangé |
| fr:209 | Traitée | none | inchangé |
| fr:210 | Refusée | refuse | rejetee |
| fr:211 | Paiement émis | none | inchangé |
| fr:212 | Paiement reçu | collect | encaissee |
| fr:213 | Rejetée | reject_final | irrecevable |
| fr:501 | Irrecevable | reject_final | irrecevable |

Codes hors table (fr:214–500, fr:502+, inconnus) : `none`. Codes `api:*` Super PDP : `api:sent` → deposit, `api:invalid` / `api:rejected` → irrecevable.

## Rotation de la clé de chiffrement (Vercel)

Variables **serveur** (Vercel → Project → Settings → Environment Variables, Production + Preview + Development) :

| Variable | Rôle |
|---|---|
| `EINVOICING_TOKEN_ENCRYPTION_KEY` | Clé AES-256 courante (32 octets, base64). `openssl rand -base64 32` |
| `EINVOICING_TOKEN_ENCRYPTION_KEY_ID` | Identifiant de cette clé (défaut `v1`). **Incrémenter à chaque rotation.** |
| `EINVOICING_TOKEN_ENCRYPTION_KEYS` | Trousseau JSON des **anciennes** clés : `{"v1":"<base64>"}` |

Procédure :

1. Générer une nouvelle clé. Lui donner un nouvel id (`v2`).
2. Mettre l’ancienne clé dans `EINVOICING_TOKEN_ENCRYPTION_KEYS` sous l’ancien id.
3. Remplacer `EINVOICING_TOKEN_ENCRYPTION_KEY` et `EINVOICING_TOKEN_ENCRYPTION_KEY_ID`.
4. Au prochain `loadTokens`, les blobs `v1` sont déchiffrés puis **re-chiffrés** en `v2`.
5. Quand plus aucun blob n’utilise `v1`, retirer `v1` du trousseau.

Si `EINVOICING_TOKEN_ENCRYPTION_KEY` change **sans** bump de `KEY_ID` ni entrée dans `KEYS`, tous les raccordements deviennent illisibles.
