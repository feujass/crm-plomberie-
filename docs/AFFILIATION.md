# Programme d'affiliation Flowo

## Où voir dans l'app (local : http://localhost:3000)

| URL | Qui y accède |
|-----|----------------|
| `/affiliation` | Public — landing + formulaire candidature |
| `/admin/affiliation` | Admin (`FLOWO_ADMIN_EMAILS`) — approuver/refuser |
| `/partenaire` | Partenaire actif — dashboard KPIs |
| `/partenaire/liens` | Partenaire — liens, textes, bannières SVG |
| `/partenaire/commissions` | Partenaire — commissions + Stripe Connect |
| `/r/CODE` | Public — lien court (ex. `/r/DUPONT2026`) |
| Compte → Espace partenaire | Partenaire actif |
| Compte → Candidatures affiliation | Admin |

## Tester en 3 minutes

1. Appliquer migrations `20260714180000` + `20260714190000`
2. Ouvrir `/affiliation` → envoyer une candidature test
3. Se connecter avec ton e-mail admin → **Compte → Candidatures affiliation** → Approuver
4. Le partenaire reçoit un e-mail ; s'il a un compte Flowo (même e-mail), il voit `/partenaire`

## Modèle

- **20 %** récurrent · cookie **30 j** · seuil virement **50 €**

## Phase 2.5 (actuel)

- **Admin UI** : `/admin/affiliation` (plus besoin de curl)
- **Cron virements** : `GET /api/cron/affiliate-payouts` (lundi 9h UTC sur Vercel)
- **Bannières SVG** : téléchargement depuis `/partenaire/liens`

### Virements automatiques

Le cron regroupe les commissions `pending`/`approved` par partenaire. Si total ≥ seuil et Stripe Connect configuré → virement Stripe.

Test manuel :
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://ton-domaine.fr/api/cron/affiliate-payouts
```

### Admin

Variable `.env.local` :
```env
FLOWO_ADMIN_EMAILS=flowo.contact@gmail.com
```

## Stripe

- Activer **Connect** (Express) dans le Dashboard Stripe
- Webhook : `invoice.paid` pour les commissions
- Partenaire : bouton dans `/partenaire/commissions`

## API interne (alternative)

`POST /api/internal/affiliate/approve` avec `CRON_SECRET` — toujours disponible pour scripts.
