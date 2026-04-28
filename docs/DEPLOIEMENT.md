# Flowo — déploiement et mise en service

Document de référence : ce que le dépôt **ne configure pas** tout seul (secrets, hébergeur, comptes tiers). La CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) valide le build, pas la bonne config de production.

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
| Crons (Vercel, etc.) | `CRON_SECRET` identique à l’en-tête `Authorization: Bearer …` appelant `/api/cron/*` |

## 3. Backend FastAPI (Mongo)

Fichier local : `backend/.env` (voir [`backend/.env.example`](../backend/.env.example)).

- `MONGO_URL`, `DB_NAME` : en prod (souvent **Atlas**), règles réseau / IP pour l’hébergeur du backend.
- `JWT_SECRET` : **au moins 32 caractères** en production (clé faible = warnings PyJWT + risque).
- `CORS_ALLOW_ORIGINS` (optionnel) : si défini, liste d’origines séparées par des **virgules** (ex. l’URL HTTPS du site Next). Sinon le serveur garde le comportement par défaut `*` (développement).

## 4. Application mobile (Expo)

Voir [`mobile/.env.example`](../mobile/.env.example) et [`mobile/APP_STORE_CHECKLIST.txt`](../mobile/APP_STORE_CHECKLIST.txt).

- `EXPO_PUBLIC_SUPABASE_*` : authentification.
- `EXPO_PUBLIC_SITE_URL` : URL **HTTPS** du **Next** en production — le client appelle `/api/assistant/chat` sur ce host ; la clé `OPENAI_API_KEY` est sur **le serveur Next**, pas sur le téléphone.

## 5. Deux canaux d’authentification

- **Web** : principalement **FastAPI + cookie** (`access_token`), données **Mongo** via l’API.
- **Mobile** : **Supabase** ; le chat cible le Next avec contexte Supabase.

Un déploiement « prêt pour les utilisateurs » exige : stack **web** (Next + clés LLM : `OPENAI_API_KEY` et/ou `ANTHROPIC_API_KEY` selon `FLOWO_LLM`, + `BACKEND_URL` + backend + Mongo) **et** stack **mobile** (Supabase + bons `EXPO_PUBLIC_*` + `OPENAI_API_KEY` côté Next pour `/api/assistant/chat`) si vous publiez l’app native.

## 6. Contrôles hors code (recommandé)

- Choisir où tournent Next, FastAPI, Mongo, builds EAS.
- Renseigner toutes les variables (staging, puis production).
- Parcours manuels : inscription / login web, pages principales, assistant avec OpenAI, mêmes parcours mobile avec l’URL de prod.
- **Monitoring** (Sentry, logs plateforme) : à activer côté hébergeur si souhaité — pas imposé par ce dépôt.

## 7. CI

La CI exécute typecheck, lint, build Next, typecheck mobile, pytest backend (avec Mongo de service). Elle **ne** proure **pas** que les secrets de production sont corrects sur Vercel / EAS / le serveur API.
