# Facturation électronique — Phase 1 (couche PA, sans réseau)

Adaptateur réel Super PDP : `EINVOICING_PROVIDER=superpdp`. Défaut `mock` (aucun appel réseau).

## Architecture

- Une **application Flowo** (`SUPERPDP_CLIENT_ID` / `SECRET` globaux). Jamais de `client_id` par entité fiscale.
- **OAuth2 authorization code par artisan** : jetons dans `einvoicing_oauth_tokens`, chiffrés AES-256-GCM. Chaque blob porte un `key_id` (`EINVOICING_TOKEN_ENCRYPTION_KEY_ID`, défaut `v1`). Le callback persiste via `saveConnectionAndTokens` **avant** le PATCH TVA : un échec de `syncConnectedVatRegime` ne déconnecte plus l’artisan. Après chaque refresh, `withFreshStoredTokens` réécrit le blob sous **verrou** (mutex processus + lease Postgres `refresh_lock_until`) : Super PDP **invalide** l’ancien `refresh_token` (OAuth 2.1 rotatif). Deux refresh concurrents sans lock → `invalid_grant` et déconnexion. En sandbox, le n° vendeur Factur-X doit matcher l’entreprise de la session (`SUPERPDP_COMPANY_NUMBER_SCHEME=sandbox`).
- **Multi-tenant** (sandbox 2026-09-08) : `client_credentials` de l’app agit sur l’entreprise sélectionnée au dashboard (Burger Queen). Après consentement, le Bearer artisan agit sur **l’entreprise du consentant**, pas sur Burger Queen. L’écran de consentement affiche toutefois le nom de l’entreprise propriétaire de l’app — question support (voir journal sandbox).
- Ingestion unique : `ingestLifecycleEvents`. Le polling (`pollAndIngestLifecycleEvents`) est le seul appelant actuel. Un webhook futur parse puis appelle la même fonction, puis `dispatchCycleSignalNotifications` pour fr:207 / fr:211.
- Cron `GET /api/cron/einvoicing-poll` : uniquement `Authorization: Bearer $CRON_SECRET` (header Vercel Cron). Planifié dans `vercel.json` (`*/15 * * * *`).
- Après un dépôt : poll ciblé **immédiat**, puis **5 s** et **30 s** (`after()` + `POST /api/factures/[id]/cycle-refresh` côté UI). Le premier `invoice_events` ne contient souvent que `api:uploaded`.

## Réception (incoming) — stratégie de rapprochement

`external_id` Flowo n’est **pas** recopié sur la copie acheteur (id Super PDP distinct, `external_id` absent). Ne pas rapprocher par id PA.

Quand on ingérera les factures reçues : clé métier **numéro de facture + SIREN émetteur + montant TTC** (champs `en_invoice.number`, `seller.legal_registration_identifier.value` scheme `0002`, `en_invoice.totals.total_with_vat`). Tolérance TTC : centime près. En cas de collision, journaliser et ne pas rattacher automatiquement.

`processing_rule` n’est **pas** envoyé au `POST /invoices` : Super PDP le calcule et rejette toute divergence. `type_client` reste interne (e-reporting, UI).

## Mapping régime TVA Flowo → Super PDP

| Flowo `regime_tva` | Super PDP `has_vat_on_debits` | Super PDP `vat_regime` |
|---|---|---|
| `encaissements` | `false` | périodicité (manquante) |
| `debits` | `true` | périodicité (manquante) |
| `franchise_293b` | `false` | `vat_exemption` (complet) |

`vat_regime` Super PDP n’est **pas** l’exigibilité : c’est la périodicité PPF (`monthly` \| `quarterly` \| `simplified` \| `vat_exemption`).

Saisie artisan : Compte → Entreprise → **Périodicité de déclaration de TVA**. Colonne `profiles.tva_periodicite_declaration`. Tant qu’elle est vide, le mapping est `incomplete` hors franchise. Au raccordement (et à chaque sauvegarde entreprise si déjà raccordé), Flowo envoie `PATCH /v1.beta/companies`.

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
