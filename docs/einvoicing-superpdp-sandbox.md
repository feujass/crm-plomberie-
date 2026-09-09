# Journal sandbox Super PDP — Burger Queen → Tricatel

Date des essais : 2026-09-08. Endpoint : `https://api.superpdp.tech` (OpenAPI 1.30.0.beta).

**Phase 1 close (2026-09-09)** — état, gates, ouvert : `docs/einvoicing-pa-phase1.md` (section Reprise).

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

### GET `/oauth2/authorize` — `redirect_uri` non enregistrée (authorization_code)

**HTTP 400** — clients sandbox vendeur / acheteur (2026-09-08). Toutes les URI testées (`http://localhost:3000/api/compte/e-facturation/callback`, `https://flowo.agency/…`, Scalar, Postman, URN oob) :

```json
{
  "error": "invalid_request",
  "error_description": "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls."
}
```

Toujours vrai pour `SUPERPDP_SELLER_*` / `BUYER_*`. L’application Flowo (`SUPERPDP_CLIENT_ID`, redirect localhost + flowo.agency whitelistés) accepte désormais le `redirect_uri` : **HTTP 303** vers `https://www.superpdp.tech/app/oauth2/authorize?authorize_request_id=…`.

### GET `/oauth2/authorize` — `state` trop court

**HTTP 303** vers notre callback :

`error=invalid_state` — *The state is missing or does not have enough characters and is therefore considered too weak. Request parameter 'state' must be at least be 8 characters long to ensure sufficient entropy.*

Flowo envoie 48 hex (24 octets) : OK.

### GET `/oauth2/authorize` — prefill entreprise

- Numéro sandbox inconnu (`000000099`) → callback `error=invalid_request`, *No company found with these superpdp_company_number_scheme and superpdp_company_number.*
- SIREN hors sandbox (`fr_siren` + 853322915) sur l’app sandbox → *Application environment do not match company environement.* (typo Super PDP).

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

Même chose avec `B2BInt` → *valeur calculée 'B2B'*. Message **en français**. Si on **omet** `processing_rule`, Super PDP calcule `B2B` et accepte (HTTP 200). **Flowo n’envoie plus `processing_rule`** : on garde `type_client` pour l’UI / e-reporting uniquement.

---

## Réception — `external_id` non propagé (stratégie, non implémentée)

Constat sandbox : vendeur `id=482779` + `external_id=flowo-e2e-…` ; acheteur `id=482780`, **pas d’`external_id`**. `GET` de l’id vendeur avec le token acheteur → 404.

**Ne pas** rapprocher une facture reçue via `external_id` ni via l’id Super PDP du vendeur.

Stratégie prévue pour l’ingestion `direction=in` :

1. `GET /v1.beta/invoices?direction=in` puis `GET /v1.beta/invoices/{id}` (détail `en_invoice`).
2. Clé de rapprochement, dans cet ordre de contrainte :
   - **numéro** (`en_invoice.number`) — identique au `BT-1` Factur-X ;
   - **SIREN émetteur** (`seller.legal_registration_identifier.value`, scheme `0002`) ;
   - **montant TTC** (`en_invoice.totals.total_with_vat`, comparaison au centime).
3. Un match unique → rattacher / créer la pièce d’achat Flowo. Zéro match → file d’attente « à qualifier ». Plusieurs matches → ne pas fusionner, signaler.
4. Stocker **l’id acheteur** (`482780`) dans `einvoicing_provider_invoice_id` de *notre* copie reçue — les `invoice_events` côté destinataire portent cet id, pas celui du vendeur.

Pas implémenté : la réception n’est pas un flux artisan Phase 1.

---

## Parcours réussi : émission B2B Burger Queen → Tricatel

1. `POST /oauth2/token` `client_credentials` vendeur → **200**, `expires_in=1799`, **pas de `refresh_token`**, `token_type=bearer` (minuscule).
2. `GET /v1.beta/oauth2_sessions/me` → **200**, `company_verification_status=verified`. (En client_credentials, le KYB est déjà vert ; le 403 « pas encore verified » n’apparaît pas sur ces comptes sandbox. À valider sur un authorization_code artisan réel.)
3. `GET /v1.beta/invoices/generate_test_invoice?format=cii&b2c=false` → **200** `application/xml`, acheteur = Tricatel.
4. `POST /v1.beta/invoices?external_id=<id Flowo>` `Content-Type: application/xml` (sans `processing_rule`) → **200**, `id=482779`, `direction=out`, `processing_rule=B2B` calculé par Super PDP.
5. Événements **vendeur** (`invoice_id=482779`), après ~1 s :

   | id | code | texte |
   |---|---|---|
   | 1461916 | `api:uploaded` | Téléversée |
   | 1461917 | `fr:200` | Déposée (validée) |
   | 1461918 | `fr:201` | Émise par la plateforme |

   Le premier poll immédiat ne voit que `api:uploaded`. Flowo re-poll **5 s** et **30 s** après le dépôt (plus le cron 15 min). `api:uploaded` = pas de changement de statut ; `fr:200` / `fr:201` → `deposee`.

6. Côté **Tricatel**, la facture n’a **pas** le même `id` : `482780`, `direction=in`, `external_id` **absent** (l’`external_id` vendeur n’est pas recopié). `GET /v1.beta/invoices/482779` en token acheteur → **404** `{ "http_status_code": 404 }` (sans message). `GET invoice_events?invoice_id=482779` en token acheteur → **200** liste vide (pas 404).

7. Événement **acheteur** sur `482780` : `fr:202` « Reçue par la plateforme ».

8. `POST application/pdf` d’un Factur-X (`generate_test_invoice?format=factur-x`) → **200**, même file d’attente `api:uploaded`.

Liste `direction=in` juste après le POST : **count=0**. Après quelques secondes : la pièce apparaît. Le cron d’ingestion côté vendeur suffit pour le cycle Flowo ; la copie acheteur a son propre `invoice_id`.

---

## OAuth artisan vs sandbox client_credentials

`client_credentials` = « vos propres données » (pas de `refresh_token`). Le raccordement produit Flowo utilise **authorization_code** (`SUPERPDP_CLIENT_ID` / `SECRET`) : `GET /oauth2/authorize` → SPA onboarding → callback `/api/compte/e-facturation/callback`. Script de sonde : `node scripts/superpdp-oauth-authcode.mjs`.

`EINVOICING_PROVIDER=mock` (défaut) ou `superpdp`.

---

## Parcours authorization_code (app Flowo, 2026-09-08)

Compte artisan **nouveau** (e-mail jetable), prefill `superpdp_company_number=000000001` / `sandbox` (Tricatel). Wizard SPA : e-mail + CGU → code alphanumérique (sujet « XXXXXXXX est votre code de vérification SUPER PDP ») → accord formel + inscription annuaire `000000001` → vérification d’identité → autorisation.

Sandbox : `https://www.superpdp.tech/app/users/sandbox_identity_verification_status` propose « Simuler une vérification d’identité réussie / qui a échoué ». Après succès, Super PDP crée une entreprise **distincte** `id=97471` (Tricatel `000000001`), puis l’écran d’autorisation.

Acceptation observée : `GET /internal/oauth2/authorize/accept?…&company_id=97471` (entreprise du consentant, **pas** Burger Queen `97118`).

### Jetons authorization_code

`POST /oauth2/token` → **200**, `expires_in=1800`, `token_type=bearer`, **`refresh_token` présent**, `scope` vide.

| Appel | HTTP | Constat |
|---|---|---|
| `GET /v1.beta/oauth2_sessions/me` | 200 | `company_verification_status=verified`, `user_identity_verification_status=verified`, `client_id` = app Flowo |
| `GET /v1.beta/companies/me` | 200 | **`id=97471` Tricatel** (`000000001` / `sandbox`) |

Même app, `client_credentials` : toujours **`id=97118` Burger Queen**. L’acheteur historique `SUPERPDP_BUYER_*` reste `97117` (autre instance Tricatel, même numéro sandbox).

Chiffrement Flowo : `EINVOICING_TOKEN_ENCRYPTION_KEY` (32 octets) roundtrip AES-256-GCM OK (`key_id=v1`). Le premier run a capturé le `code` sur `:3000` sans Next ; le parcours callback + émission réelle est décrit ci-dessous.

### Restriction dashboard « entreprise sélectionnée »

Texte dashboard / GrandTotal : *« Les droits d'une application OAuth sont restreints à l'entreprise choisie. »* Ici : Burger Queen.

**Ce que ça fait vraiment (sandbox) :**

1. **`client_credentials`** de `SUPERPDP_CLIENT_ID` = Burger Queen `97118` uniquement. Aligné avec le texte.
2. **`authorization_code`** n’empêche **pas** d’agir sur un tiers après consentement : Bearer artisan = Tricatel `97471`. Spec OpenAPI : *Use authorization code to access data of another user after he gives his consent.*
3. **Marque / UX** : l’écran final dit *« Autoriser **Burger Queen** à gérer mon compte SUPER PDP. Burger Queen aura accès à mes factures… »* — pas « Flowo ». L’app est affichée sous le nom de l’entreprise propriétaire, pas sous un nom d’ISV.

Le modèle multi-tenant Flowo (un `client_id`, N artisans) **n’est pas cassé** sur l’accès API. En revanche le consentement est trompeur tant que l’app est créée sous Burger Queen.

**Questions support Super PDP :**

1. Confirmer qu’en production, `authorization_code` reste scopé sur l’entreprise du consentant, même si l’app a été créée sous une autre entreprise.
2. Comment nommer l’application **Flowo** sur l’écran d’autorisation (indépendamment de l’entreprise sélectionnée au dashboard) ?
3. Faut-il créer l’app OAuth sous une entreprise « éditeur » Flowo / Super G plutôt que sous un client sandbox ?
4. `POST /v1.beta/companies` (accountants) reste interdit ; l’onboarding artisan passe uniquement par ce wizard — confirmer.

### 403 KYB — non observé sur ce chemin

OpenAPI : si `company_verification_status ≠ verified`, les **autres** routes répondent 403 ; `/oauth2_sessions/me` sert à lire le statut.

Le wizard **n’émet le `code` qu’après** l’étape 4 (identité). En sandbox, la simulation « réussie » passe la session à `verified` **avant** l’étape 5. Donc : pas de Bearer « en attente de KYB », pas de 403. `client_credentials` Burger Queen / Tricatel est déjà `verified` et masque le cas.

La simulation « échouée » existe ; on ne l’a pas poussée jusqu’à un jeton. Flowo mappe déjà un 403 `/oauth2_sessions/me` → `pending_verification`. Enum public : `verified` \| `needs_review` \| `failed` (pas de `pending` dans la spec).

### Refresh rotatif (OAuth 2.1) — observé

Uniquement sur **authorization_code** (`client_credentials` : pas de refresh).

1. Refresh #1 → **200**, nouveau `refresh_token` (`refresh_changed=true`), `expires_in=1800`.
2. Rejouer l’**ancien** refresh → **400**

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The refresh token is malformed or not valid."
}
```

3. Refresh #2 avec le **nouveau** jeton → **200**, rotation encore (`refresh_changed_again=true`). `companies/me` reste `97471`.

Flowo doit persister le nouveau refresh à chaque `withFreshTokens` (déjà le cas via `saveTokens`). Deux refresh concurrents avec le même jeton : le second prendra ce 400. Lease Postgres `einvoicing_lock_oauth_tokens` appliqué sur le projet distant (2026-09-08).

---

## Parcours Next réel (session Flowo locale, 2026-09-08)

`next dev` sur `http://localhost:3000` avec `EINVOICING_PROVIDER=superpdp`, `SUPERPDP_COMPANY_NUMBER_SCHEME=sandbox`, `SUPERPDP_COMPANY_NUMBER=000000001`. Compte artisan **nouveau**, bouton **Connecter mon entreprise** depuis `/compte/e-facturation`.

### Callback Next

Wizard Super PDP identique (OTP alphanumérique, simulation d’identité réussie, écran « Autoriser **Burger Queen** » inchangé). Retour sur `/api/compte/e-facturation/callback` :

- cookie CSRF `flowo_einvoicing_oauth_state` accepté ;
- `exchangeAuthorizationCode` + `saveConnectionAndTokens` OK ;
- `GET /api/compte/e-facturation` → `verified`, `providerCompanyId=97519` (nouvelle instance Tricatel `000000001`, distincte de `97471` / `97117`).

Premier essai : après la persistance, `syncConnectedVatRegime` appelait le RPC de lock **absent** du schéma distant → redirection `?error=Could not find the function public.einvoicing_lock_oauth_tokens…` alors que l’écran affichait déjà « Raccordé ». Migration lock poussée. Le callback **ne fait plus échouer** le raccordement si le PATCH TVA rate : les jetons sont déjà sauvés.

### Émission depuis le compte raccordé

1. SIREN profil Luhn (`732829320`) + session `000000001` → **HTTP 400** *« L’entreprise (000000001) liée à cette session ne correspond pas au vendeur de la facture (732829320). »* Le vendeur Factur-X doit porter le numéro de l’entreprise consentante. Les numéros sandbox ne passent pas Luhn : Flowo les accepte seulement si `SUPERPDP_COMPANY_NUMBER_SCHEME=sandbox`.
2. Vendeur `000000001`, acheteur `000000002`, devis 1 ligne fourniture → facture `FACT-2026-0001` → Factur-X → `POST /deposit` **200**, `providerInvoiceId=484732`, `processing_rule=B2B` (calculé par Super PDP).
3. Poll 5 s / 30 s + `cycle-refresh` : journal `api:uploaded` puis `api:invalid` → `statut_cycle_vie=irrecevable` (« Rejetée ») sur `/facturation/{id}`. Le HTTP de dépôt a réussi ; le rejet est sémantique, après file d’attente. Motif PA non affiché tant que `api:invalid` n’était pas dans les codes de motif (corrigé). Webhooks toujours en attente du support — rien branché.

### Motif exact `api:invalid` (facture `484732` / Flowo `FACT-2026-0001`)

`status_text` Super PDP : **Invalide**. Champ `data.reason` (1747 caractères), recopié tel quel :

```
Value of '@schemeID' is not allowed. at /*:CrossIndustryInvoice[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]/*:SupplyChainTradeTransaction[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]/*:ApplicableHeaderTradeAgreement[namespace-uri()='urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'][1]/*:BuyerTradeParty[namespace-uri()='urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'][1]/*:SpecifiedTaxRegistration[namespace-uri()='urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'][1]/*:ID[namespace-uri()='urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'][1]
[PEPPOL-EN16931-R008]-Document MUST not contain empty elements. (still status warning) at /*:CrossIndustryInvoice[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]/*:SupplyChainTradeTransaction[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]/*:ApplicableHeaderTradeDelivery[namespace-uri()='urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'][1]
BR-FR-08/BT-23 : La valeur du mode de facturation (ram:ID) est absente ou n’est pas autorisée. Valeurs acceptées : B1, S1, M1, B2, S2, M2, S3, B4, S4, M4, S5, S6, B7, S7, B8, S8, M8, B9, S9, M9.
        Valeur actuelle : "".
        Veuillez utiliser une valeur conforme à la liste des modes de facturation autorisés. at /*:CrossIndustryInvoice[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]/*:ExchangedDocumentContext[namespace-uri()='urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'][1]
```

Ce n’est **pas** le numéro d’entreprise vendeur (`000000001` a déjà passé le contrôle session). L’erreur bloquante est `schemeID="FC"` sur l’**acheteur** (SIREN sans `tva_intracom`). Mustang 2.23.0 dit la même chose (`FX-SCH-A-000031`) ; Super PDP cite `FX-SCH-A-000570`. Les deux autres lignes sont des warnings (élément `ApplicableHeaderTradeDelivery` vide, BT-23 absent).

Correctif générateur : TVA acheteur dérivée du SIREN (`schemeID="VA"`), `FC` réservé au vendeur en franchise 293 B, BT-23 `B1`/`S1`/`M1`, pas d’élément Delivery vide. `POST /v1.beta/validation_reports` sur le XML corrigé : `is_valid: true`. Fixture `fixtureProSansTvaIntracom` ajoutée à `validate:facturx`.

Après ce correctif, une nouvelle émission (facture Super PDP `484894`) a passé la Schematron (`api:validated`) puis a été rejetée : **`em:acheteur@example.test is an invalid address`**. L’adresse électronique CII ne doit pas être un e-mail (`schemeID="EM"`) : en France c’est `0225`.

`0225:000000002` (SIREN nu) est résolu dans l’annuaire mais le pre-check Peppol refuse Factur-X : *receiver address \<0225:000000002\> does not accept this document*. L’identifiant Peppol sandbox réel est `0225:315143296_{company_id}` (Burger Queen = `315143296_97118`). Lookup `GET /v1.beta/directory_entries` à la génération Factur-X.

### Émission acceptée de bout en bout (2026-09-08)

Nouveau compte artisan, OAuth `verified`, entreprise Super PDP `97554` (Tricatel `000000001`). Facture Flowo `252828cf-5020-4eaf-b1e3-8d4880a0ebc6` / `FACT-2026-0001` → dépôt **200**, `providerInvoiceId=484970`, `processing_rule=B2B`.

Journal : `api:uploaded` → **`fr:200`** (Déposée) → **`fr:201`** (Transmise). Page `/facturation/{id}` : **Déposée**. `statut_cycle_vie=deposee`.

### Delivery CII + services sans ShipTo (2026-09-08)

Le XSD exige `ApplicableHeaderTradeDelivery` même sans adresse de livraison distincte. Le générateur omettait l’élément sur les factures de **services** (144/216 Mustang). Correctif : toujours émettre Delivery avec `ActualDeliverySupplyChainEvent` (fin de prestation ou date d’émission), ShipTo seulement si l’adresse diffère. Matrice **216/216** Mustang ; les 16 `BR-FR-12` / BT-49 ne réapparaissent pas une fois le XSD vert.

Dépôt sandbox du cas manquant — **services**, **pas de ShipTo** :

- Flowo `ed5ce47f-9687-4fa3-aa77-353ff98d3b40` / `FACT-2026-0002` (dépannage, client pro sans adresse de livraison)
- XML : `ApplicableHeaderTradeDelivery` + `ActualDeliverySupplyChainEvent`, pas de `ShipToTradeParty`, pas d’élément vide
- `POST /deposit` **200** en ~3,6 s (validation_reports amont puis `POST /invoices`, pas de 422)
- Super PDP `providerInvoiceId=485387`
- Journal UI : `api:uploaded` → **`fr:200`** → **`fr:201`**. `statut_cycle_vie=deposee`

