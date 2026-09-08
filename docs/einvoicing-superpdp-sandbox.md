# Journal sandbox Super PDP — Burger Queen → Tricatel

Date des essais : 2026-09-08. Endpoint : `https://api.superpdp.tech` (OpenAPI 1.30.0.beta).

Les `client_id` / `client_secret` / `access_token` ne sont **pas** recopiés. Script : `node scripts/superpdp-sandbox-e2e.mjs`.

Identités sandbox constatées :

| Rôle | Nom | `companies.id` | `number` | `number_scheme` |
|---|---|---|---|---|
| Vendeur | Burger Queen | 97118 | `000000002` | `sandbox` |
| Acheteur | Tricatel | 97117 | `000000001` | `sandbox` |

Adresse électronique de routage (CII) : scheme `0225`, valeur `315143296_{company_id}` (ex. `315143296_97118`). Identifiant légal : scheme `0002` + le `number` sandbox. TVA : `FR18000000002` / `FR15000000001`.

`GET /v1.beta/companies/me` renvoie `vat_regime: ""` (chaîne vide, pas `null`) tant qu’aucun PATCH n’a été fait.

---

## Formes d’erreur (deux schémas distincts)

### OAuth (`/oauth2/token`, `/oauth2/authorize`)

RFC 6749 : `{ "error": "...", "error_description": "..." }`. Pas de `http_status_code`.

### API `/v1.beta/*`

`{ "http_status_code": <int>, "message"?: "<texte>" }`. Le champ `message` est **absent** sur certains 401/404.

Flowo mappe : 401 → `TokenExpiredError` (sauf `/oauth2/token`) ; 403 → `SessionNotVerifiedError` ; le reste → `SuperPdpApiError` (statut + path + corps).

---

## Erreurs rencontrées

### POST `/oauth2/token` — `grant_type=authorization_code` avec un code invalide

**HTTP 400**

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client."
}
```

### POST `/oauth2/token` — `grant_type=refresh_token` avec un refresh malformé

**HTTP 400** — même `error: invalid_grant`, `error_description` se termine par : *The refresh token is malformed or not valid.*

### POST `/oauth2/token` — `client_credentials` sans `Authorization: Basic`

**HTTP 400**

```json
{
  "error": "invalid_request",
  "error_description": "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. Client credentials missing or malformed in both HTTP Authorization header and HTTP POST body."
}
```

Les credentials **doivent** être en HTTP Basic (comme l’indique Scalar : *Credentials Location: header*). Body `client_id`/`client_secret` seuls : insuffisant.

### GET `/oauth2/authorize` sans `client_id`

**HTTP 401**

```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method). The requested OAuth 2.0 Client does not exist."
}
```

### GET `/v1.beta/companies/me` sans Bearer

**HTTP 401**

```json
{ "http_status_code": 401 }
```

Pas de `message`. Idem probable sur les autres routes métier.

### POST `/v1.beta/companies` en `application/json` (enroll accountants)

**HTTP 400**

```json
{
  "http_status_code": 400,
  "message": "multipart body is required: request Content-Type isn't multipart/form-data"
}
```

Confirme le modèle Flowo : **ne pas** appeler `POST /v1.beta/companies` (accountants only). Le raccordement artisan passe par authorization code + `PATCH /v1.beta/companies` pour la TVA.

### PATCH `/v1.beta/companies` — `vat_regime` hors enum

**HTTP 400**

```json
{ "http_status_code": 400, "message": "invalid vat_regime" }
```

Enum accepté : `monthly` | `quarterly` | `simplified` | `vat_exemption`. Un PATCH `monthly` + `has_vat_on_debits: false` (mapping Flowo encaissements + périodicité mensuelle) → **HTTP 200**.

### POST `/v1.beta/invoices` — JSON

**HTTP 400**

```json
{ "http_status_code": 400, "message": "unknown format" }
```

Pas de JSON. Uniquement `application/xml` (CII/UBL), `application/pdf` (Factur-X) ou multipart fichier.

### POST `/v1.beta/invoices` — XML tronqué / mal formé

**HTTP 400** `etree: invalid XML format` (XML incomplet).

**HTTP 400** `XML syntax error on line 1: unexpected EOF` (corps `<not-xml`).

### POST `/v1.beta/invoices?processing_rule=B2C` sur une facture CII B2B (Burger Queen → Tricatel)

**HTTP 400**

```json
{
  "http_status_code": 400,
  "message": "Le paramètre processing_rule 'B2C' ne correspond pas à la valeur calculée 'B2B'"
}
```

Même chose avec `B2BInt` → *valeur calculée 'B2B'*. Message **en français**. Si on **omet** `processing_rule`, Super PDP calcule `B2B` et accepte (HTTP 200). Flowo envoie quand même `processing_rule` (B2B si `type_client != particulier`).

---

## Parcours réussi : émission B2B Burger Queen → Tricatel

1. `POST /oauth2/token` `client_credentials` vendeur → **200**, `expires_in=1799`, **pas de `refresh_token`**, `token_type=bearer` (minuscule).
2. `GET /v1.beta/oauth2_sessions/me` → **200**, `company_verification_status=verified`. (En client_credentials, le KYB est déjà vert ; le 403 « pas encore verified » n’apparaît pas sur ces comptes sandbox. À valider sur un authorization_code artisan réel.)
3. `GET /v1.beta/invoices/generate_test_invoice?format=cii&b2c=false` → **200** `application/xml`, acheteur = Tricatel.
4. `POST /v1.beta/invoices?processing_rule=B2B&external_id=<id Flowo>` `Content-Type: application/xml` → **200**, `id=482779`, `direction=out`, `processing_rule=B2B`.
5. Événements **vendeur** (`invoice_id=482779`), après ~1 s :

   | id | code | texte |
   |---|---|---|
   | 1461916 | `api:uploaded` | Téléversée |
   | 1461917 | `fr:200` | Déposée (validée) |
   | 1461918 | `fr:201` | Émise par la plateforme |

   Le premier poll immédiat ne voit que `api:uploaded`. **Il faut re-poller** (cron 15 min, ou poll après dépôt). Flowo : `api:uploaded` = pas de changement de statut ; `fr:200` / `fr:201` → `deposee`.

6. Côté **Tricatel**, la facture n’a **pas** le même `id` : `482780`, `direction=in`, `external_id` **absent** (l’`external_id` vendeur n’est pas recopié). `GET /v1.beta/invoices/482779` en token acheteur → **404** `{ "http_status_code": 404 }` (sans message). `GET invoice_events?invoice_id=482779` en token acheteur → **200** liste vide (pas 404).

7. Événement **acheteur** sur `482780` : `fr:202` « Reçue par la plateforme ».

8. `POST application/pdf` d’un Factur-X (`generate_test_invoice?format=factur-x`) → **200**, même file d’attente `api:uploaded`.

Liste `direction=in` juste après le POST : **count=0**. Après quelques secondes : la pièce apparaît. Le cron d’ingestion côté vendeur suffit pour le cycle Flowo ; la copie acheteur a son propre `invoice_id`.

---

## OAuth artisan vs sandbox client_credentials

`client_credentials` = « vos propres données » (pas de refresh rotatif). Le raccordement produit Flowo utilise **authorization_code** (`SUPERPDP_CLIENT_ID` / `SECRET`, fallback sandbox `SUPERPDP_SELLER_*`) : redirect `GET /oauth2/authorize` avec `login_hint`, `superpdp_company_number`, `superpdp_company_number_scheme`, callback `/api/compte/e-facturation/callback`. Prefill sandbox : `SUPERPDP_COMPANY_NUMBER_SCHEME=sandbox` + numéro `000000002` (Burger Queen).

`EINVOICING_PROVIDER=mock` (défaut) ou `superpdp`.
