# RGPD — traitement des données (Flowo)

## Finalités

- Exécution du contrat (compte utilisateur, devis, facturation, paiements).
- Obligations légales (conservation des pièces comptables, factures).
- Amélioration du produit (statistiques PostHog, **uniquement avec consentement cookies**).

## Sous-traitants

Liste publique : `/legal/confidentialite` et `/legal/cookies` (`lib/cookies/catalog.ts`).

**DPA (contrats art. 28 RGPD)** : à accepter côté dashboards prestataires — voir checklist détaillée [`docs/DPA-CHECKLIST.md`](./DPA-CHECKLIST.md). Non automatisable dans le code ; archiver les PDF localement.

Prestataires concernés : Supabase, Vercel, Stripe, Resend, Anthropic (Zeus), Twilio et PostHog si activés.

## Durées

- Données de facturation : **6 ans** minimum (obligation légale française).
- Compte actif : durée du contrat ; suppression à la demande via Compte → Sécurité.
- Logs techniques : 12 mois max.
- PostHog : 12 mois (configurable dans le projet PostHog).
- Export : `/api/export/me` (UI : Compte → Sécurité → Télécharger mes données).

## Droits des personnes

- **Accès / portabilité** : export JSON dans Compte → Sécurité.
- **Rectification** : profil et entreprise dans l'application.
- **Effacement** : suppression du compte (avertissement factures 6 ans).
- **Cookies** : bannière + Compte → Sécurité → Gérer les cookies.
- **Consentement inscription** : case CGU + confidentialité ; horodatage `profiles.privacy_accepted_at`.

## Sécurité

- Authentification par jeton, RLS / isolation par `user_id` côté API.
- Ne pas committer de secrets ; variables d'environnement.

## Pages légales (app)

- `/legal/confidentialite` — politique complète
- `/legal/cookies` — traceurs et PostHog
- `/legal/cgu` — conditions d'utilisation (B2B, abonnement, responsabilité)
- `/legal/sous-traitance` — accord art. 28 RGPD (données clients des artisans)
- `/legal/mentions` — éditeur (NEXT_PUBLIC_LEGAL_*), hébergeur Vercel

## Registre des traitements (interne)

Document formalisé : [`docs/registre-traitements-flowo.md`](./registre-traitements-flowo.md) — **PDF** : [`docs/registre-traitements-flowo.pdf`](./registre-traitements-flowo.pdf) (`npm run legal:registre-pdf`).

À conserver avec les DPA prestataires (`DPA Flowo/` sur le Bureau).

## Analytics (PostHog)

Variables : `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (UE : `https://eu.i.posthog.com`).

PostHog ne se charge que si l'utilisateur accepte les cookies analytiques.

Événements : pages vues (`$pageview`), identification utilisateur (id, plan, métier — pas de contenu devis).
