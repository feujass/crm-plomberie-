# Analytics parcours — dashboard App Data flowo

Collecte anonyme des **page_view** / **page_exit** (temps sur page, pays, referrer) depuis flowo.agency vers Supabase. Le dashboard local **App Data flowo** lit la table `analytics_events`.

**Leads landing** : tentatives connexion/inscription (e-mail, nom, entreprise…) dans `landing_leads`, alimentées par `/api/auth/login` et `/api/auth/register`.

## Déploiement Flowo (une fois)

1. Exécuter la migration `supabase/migrations/20260729160000_analytics_events.sql` et `supabase/migrations/20260826180000_landing_leads.sql` dans le [SQL Editor Supabase](https://supabase.com/dashboard/project/uvgjcozdqxnrnfmkmlwa/sql/new) (ou le bloc correspondant dans `apply-all-pending-migrations.sql`).
2. Redéployer Flowo (snippet analytics + routes auth avec capture leads).

## Fichiers intégrés

| Rôle | Fichier |
|------|---------|
| Tracker client | `components/analytics/AnalyticsTracker.tsx` |
| Capture leads auth | `lib/analytics/capture-landing-lead.ts` |
| Hook parcours | `lib/analytics/use-analytics.ts` |
| Session anonyme | `lib/analytics/session.ts` |
| Envoi events | `lib/analytics/track-client.ts` |
| API ingestion | `app/api/track/route.ts` |
| Table parcours | `analytics_events` |
| Table leads | `landing_leads` |

## Événements

- **page_view** — à chaque changement de route
- **page_exit** — à la navigation suivante ou fermeture d’onglet (`time_on_page_ms`)
- **landing_leads** — à chaque soumission login/register (succès ou échec, sans mot de passe)

`session_id` = UUID en localStorage (`flowo_analytics_session_id`), lié aux leads si disponible.

## Dashboard local

Lancer le projet **App Data flowo** (`/Users/jules/Desktop/App Data flowo`) avec les mêmes credentials Supabase (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).

Section **Leads landing** : filtres par page (login/register), succès/échec, recherche e-mail.

## RGPD

- `analytics_events` : pas de PII
- `landing_leads` : données saisies volontairement (formulaires auth) — finalité suivi marketing interne
- Jamais de mot de passe stocké
- Distinct de PostHog (consentement cookies analytiques)
- Mentionné dans la politique cookies (localStorage session anonyme)
