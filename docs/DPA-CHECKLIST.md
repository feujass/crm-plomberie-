# DPA — checklist sous-traitants (Flowo / Jules Berliat)

> **Statut global : à faire côté juridique/commercial** — la transparence produit est en place (`/legal/confidentialite`), mais les **accords formels** avec chaque prestataire doivent être acceptés ou signés par l’éditeur (responsable de traitement).

## Deux niveaux à distinguer

| Niveau | Qui | Quoi |
|--------|-----|------|
| **A. Flowo → prestataires** | Jules Berliat (éditeur) | DPA avec Supabase, Stripe, Vercel, etc. |
| **B. Artisans → Flowo** | Tes clients SaaS | Accord public `/legal/sous-traitance` (art. 28), incorporé aux CGU |

---

## A. DPA éditeur ↔ sous-traitants (à cocher manuellement)

Légende : 🟢 souvent inclus / 1 clic · 🟡 à vérifier dans le dashboard · 🔴 action requise

| Prestataire | Usage Flowo | DPA / où l’obtenir | Statut à valider |
|-------------|-------------|--------------------|------------------|
| **Supabase** | Auth, BDD, storage | [Supabase DPA](https://supabase.com/legal/dpa) — acceptation dans Dashboard → Organization → Legal | 🟡 Accepter + vérifier **région projet** (UE recommandée) |
| **Vercel** | Hébergement Next.js | [Vercel DPA](https://vercel.com/legal/dpa) — souvent inclus aux CGU Pro/Team ; vérifier ton plan | 🟡 |
| **Stripe** | Abonnements | [Stripe DPA](https://stripe.com/fr/legal/dpa) — Dashboard → Settings → Legal documents | 🟢 Accepter en ligne |
| **Resend** | E-mails transactionnels | [Resend legal](https://resend.com/legal) — vérifier DPA / SCC sur compte Pro | 🟡 |
| **Anthropic** | Zeus (IA) | [Anthropic Commercial Terms / DPA](https://www.anthropic.com/legal) — selon type de compte API | 🟡 Accepter CGU API + DPA si proposé |
| **Twilio** | WhatsApp/SMS (plus tard) | [Twilio DPA](https://www.twilio.com/legal/data-protection-addendum) | ⬜ Si activé en prod |
| **PostHog** | Analytics (consentement) | [PostHog DPA](https://posthog.com/dpa) — héberger projet en **EU** (`eu.posthog.com`) | ⬜ Si `NEXT_PUBLIC_POSTHOG_KEY` configuré |

### Actions concrètes (1 h)

1. Se connecter à chaque dashboard avec le compte **professionnel** (Jules Berliat / micro-entreprise).
2. Pour chaque ligne du tableau : télécharger ou « Accept » le DPA ; archiver le PDF dans `Micro-entreprise/Flowo/legal/dpa/` (dossier local, **ne pas committer**).
3. Noter la date d’acceptation dans le tableau ci-dessous.

### Registre interne (à remplir)

| Prestataire | DPA accepté le | Région / SCC | Fichier archivé |
|-------------|----------------|--------------|-----------------|
| Supabase | | | |
| Vercel | | | |
| Stripe | | | |
| Resend | | | |
| Anthropic | | | |
| Twilio | | | |
| PostHog | | | |

---

## B. Flowo en sous-traitant des artisans (données clients BTP)

**Déjà dans le produit :**

- `/legal/sous-traitance` — accord art. 28 RGPD (sous-traitants ultérieurs, sécurité, fin de contrat)
- `/legal/confidentialite` §7 + CGU §8
- Registre interne : `docs/registre-traitements-flowo.md`
- Suppression compte, export JSON, contact `flowo.contact@gmail.com`

---

## Ce que le code couvre déjà

| Élément | Fichier / page |
|---------|----------------|
| Liste publique sous-traitants | `lib/cookies/catalog.ts` → `/legal/confidentialite` |
| Durées de conservation | idem |
| Consentement cookies / analytics | Bannière + `/legal/cookies` |
| Consentement inscription | Case CGU + sous-traitance + `privacy_accepted_at` |
| Accord sous-traitance artisan | `/legal/sous-traitance` |
| Registre traitements (interne) | `docs/registre-traitements-flowo.md` |
| Export / suppression | Compte → Sécurité |

---

## Checkbox checklist lancement

- [ ] DPA Supabase accepté + projet en région UE si possible
- [ ] DPA Vercel / Stripe acceptés
- [ ] DPA Resend + Anthropic (API Zeus)
- [ ] DPA Twilio / PostHog **si** services activés en prod
- [ ] Dossier PDF archivé localement
- [ ] (Optionnel) Annexe sous-traitance Flowo ↔ artisans

**Verdict : coché** lorsque les lignes du registre interne et les PDF DPA sont archivés.

Registre des traitements : [`docs/registre-traitements-flowo.md`](./registre-traitements-flowo.md).

Accord sous-traitance public : `/legal/sous-traitance` (incorporé aux CGU).
