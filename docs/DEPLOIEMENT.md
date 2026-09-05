# Flowo — déploiement et mise en service

Document de référence : ce que le dépôt **ne configure pas** tout seul (secrets, hébergeur, comptes tiers). La CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) valide le build, pas la bonne config de production.

## Périmètre MVP web (phase sas)

**Actif et maintenu :**

- Application web Next.js + backend FastAPI + MongoDB
- Parcours : inscription → devis vocal/texte → édition → envoi e-mail → page publique client → relances cron
- Clients, catalogue ouvrages, facturation basique, graphiques CA (accueil + rentabilité)
- Auth web : cookie JWT FastAPI (`access_token`)

**En pause (code conservé, hors navigation principale) :**

- App mobile Expo (`mobile/`) — pas de publication App Store pour l’instant
- Projet Swift natif (`Flowo/`)
- Dossier legacy (`_legacy/`)
- Chantiers, conformité PDP avancée, équipe multi-utilisateurs, Stripe visible
- Assistant chat séparé (`/assistant`) — Zeus est intégré au flux « Nouveau devis »

**Supabase (périmètre réduit) :** upload logo (fallback data URL), webhooks Stripe (masqué UI). Le flux devis/clients/relances ne dépend plus de Supabase.

## Checklist mise en production (MVP)

Variables **obligatoires** :

| Couche | Variables |
|--------|-----------|
| Next | `BACKEND_URL`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET` |
| Backend | `MONGO_URL`, `DB_NAME`, `JWT_SECRET` (≥ 32 car.), `CRON_SECRET` (identique à Next), `CORS_ALLOW_ORIGINS` en prod |

Tests manuels recommandés :

1. Inscription → `/devis/nouveau?tab=voice` → génération → envoi → ouvrir le lien public en navigation privée
2. Cron relance devis : `curl -H "Authorization: Bearer $CRON_SECRET" "$NEXT_PUBLIC_SITE_URL/api/cron/relances-devis"`
3. Safari iOS : micro + enregistrement vocal
4. Devis accepté → facture → lien public `/f/{token}`

## 1. Agents IA (Next.js) — OpenAI et option Claude (web)

Les routes d’**inférence** tournent dans **Next.js**, pas sur le FastAPI `server.py` (`/api/ai/*` en **501** — désactivées). La logique partagée du chat **web** est dans [`lib/llm/flowoChatCompletion.ts`](../lib/llm/flowoChatCompletion.ts).

| Fichier | Rôle |
|---------|------|
| [`app/api/assistant/flowo-chat/route.ts`](../app/api/assistant/flowo-chat/route.ts) | Web : user via **cookie JWT** ; LLM = **OpenAI** par défaut ou **Claude** si `FLOWO_LLM=claude` |
| [`app/api/assistant/chat/route.ts`](../app/api/assistant/chat/route.ts) | Mobile : user via **Supabase** ; **OpenAI** uniquement (pas encore d’équivalent Anthropic ici) |
| génération devis, vision, transcription | **OpenAI** uniquement |

**Assistant web (`flowo-chat`)** : définir `FLOWO_LLM=openai` (défaut) ou `FLOWO_LLM=claude`.

- Mode **openai** : `OPENAI_API_KEY` obligatoire, `OPENAI_MODEL` optionnel (défaut `gpt-4o`).
- Mode **claude** : `ANTHROPIC_API_KEY` obligatoire ; `ANTHROPIC_MODEL` optionnel (défaut `claude-sonnet-4-20250514` dans le code) ; `ANTHROPIC_MAX_TOKENS` optionnel (plafonné, défaut 4096).

**Autres routes IA** (hors `flowo-chat` en mode claude) : `OPENAI_API_KEY` requise. Vérifier budget / quotas côté fournisseur.

## 2. Application web (Next)

Copier [`.env.example`](../.env.example) → `.env.local` (jamais commité).

| Besoin | Variables |
|--------|-----------|
| Données métier (devis, clients, etc.) | `BACKEND_URL` = URL **HTTPS** publique de l’API FastAPI |
| Erreur si manquant (layout app connectée) | `BACKEND_URL` |
| Liens e-mails, pages publiques, Stripe, crons | `NEXT_PUBLIC_SITE_URL` = URL **HTTPS** du site |
| Supabase (auth / flows) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; côté serveur admin : `SUPABASE_SERVICE_ROLE_KEY` |
| E-mails | `RESEND_API_KEY`, `RESEND_FROM` |
| Paiement | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc. + URL webhook = déploiement actuel |
| Crons (Vercel, etc.) | `CRON_SECRET` identique à l’en-tête `Authorization: Bearer …` appelant `/api/cron/*` **et** côté `backend/.env` pour les endpoints `/api/cron/devis-a-relancer` |

## 3. Backend FastAPI (Mongo)

Fichier local : `backend/.env` (voir [`backend/.env.example`](../backend/.env.example)).

- `MONGO_URL`, `DB_NAME` : en prod (souvent **Atlas**), règles réseau / IP pour l’hébergeur du backend.
- `JWT_SECRET` : **au moins 32 caractères** en production (clé faible = warnings PyJWT + risque).
- `CORS_ALLOW_ORIGINS` (optionnel) : si défini, liste d’origines séparées par des **virgules** (ex. l’URL HTTPS du site Next). Sinon le serveur garde le comportement par défaut `*` (développement).

## 4. Application mobile (Expo) — en pause

Voir [`mobile/.env.example`](../mobile/.env.example). Non requis pour le MVP web sas.

## 5. Authentification web

- **Web MVP** : **FastAPI + cookie** (`access_token`), données **Mongo** via l'API.
- Supabase : optionnel (logo, Stripe webhook legacy).

## 6. Contrôles hors code (recommandé)

- Choisir où tournent Next, FastAPI, Mongo, builds EAS.
- Renseigner toutes les variables (staging, puis production).
- Parcours manuels : inscription / login web, pages principales, assistant avec OpenAI, mêmes parcours mobile avec l’URL de prod.
- **Monitoring** (Sentry, logs plateforme) : à activer côté hébergeur si souhaité — pas imposé par ce dépôt.

## 7. CI

La CI exécute typecheck, lint, build Next, typecheck mobile, pytest backend (avec Mongo de service). Elle **ne** proure **pas** que les secrets de production sont corrects sur Vercel / EAS / le serveur API.
