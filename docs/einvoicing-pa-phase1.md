# Facturation électronique — Phase 1 (couche PA, sans réseau)

Adaptateur réel Super PDP : plus tard. Aujourd’hui `getEInvoicingProvider()` renvoie `MockProvider`.

## Architecture

- Une **application Flowo** (client_id/secret globaux, pas encore branchés).
- **OAuth2 authorization code par artisan** : jetons dans `einvoicing_oauth_tokens`, chiffrés AES-256-GCM (`EINVOICING_TOKEN_ENCRYPTION_KEY`).
- Jamais de `client_id` par entité fiscale.
- Ingestion unique : `ingestLifecycleEvents`. Le polling (`pollAndIngestLifecycleEvents`) est le seul appelant actuel. Un webhook futur parse puis appelle la même fonction.

## Mapping régime TVA Flowo → Super PDP

| Flowo `regime_tva` | Super PDP `has_vat_on_debits` | Super PDP `vat_regime` |
|---|---|---|
| `encaissements` | `false` | périodicité (manquante) |
| `debits` | `true` | périodicité (manquante) |
| `franchise_293b` | `false` | `vat_exemption` (complet) |

`vat_regime` Super PDP n’est **pas** l’exigibilité : c’est la périodicité PPF (`monthly` \| `quarterly` \| `simplified` \| `vat_exemption`).

**Manque en base (et à l’UI entreprise) :** la périodicité mensuel / trimestriel / simplifié. Colonne nullable `profiles.tva_periodicite_declaration`. Tant qu’elle est vide, le mapping est `incomplete` hors franchise.

## Cycle de vie `statut_cycle_vie`

`brouillon → emise → deposee → rejetee \| encaissee`

Codes `fr:*` : voir `lib/facturation/pa/cycle-machine.ts` (`FR_STATUS_EFFECT`).
