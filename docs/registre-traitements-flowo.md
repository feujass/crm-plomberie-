# Registre des activités de traitement — Flowo

Document interne (responsable de traitement : **Jules Berliat**, micro-entrepreneur).  
Dernière mise à jour : **28 juillet 2026**.  
Version alignée sur les pages légales : `2026-07-28`.

> Ce registre complète les pages publiques `/legal/*`. À conserver avec les DPA prestataires (`DPA Flowo/`).
>
> **PDF** : `docs/registre-traitements-flowo.pdf` (régénérer avec `npm run legal:registre-pdf`).

---

## 1. Responsable de traitement

| Champ | Valeur |
|-------|--------|
| Raison sociale | Jules Berliat |
| Forme | Micro-entrepreneur (commerçant) |
| SIRET | 100 138 502 00016 |
| Adresse | 22B allée Claude Dumont, 69300 Caluire-et-Cuire |
| Contact privacy | flowo.contact@gmail.com |
| DPO | Non désigné (non obligatoire à cette échelle) |

---

## 2. Traitements — comptes artisans (utilisateurs Flowo)

| Finalité | Base légale | Données | Durée | Destinataires / sous-traitants |
|----------|-------------|---------|-------|--------------------------------|
| Création et gestion du compte | Contrat | Identité, e-mail, tel, entreprise, SIRET, mot de passe (hash) | Durée du compte + suppression | Supabase, Vercel |
| Fourniture CRM (devis, clients, factures) | Contrat | Données métier saisies par l'artisan | Durée du compte | Supabase, Vercel |
| Assistant IA Zeus | Contrat | Texte / voix devis, prompts | Jusqu'à génération ou suppression compte | Anthropic |
| Paiement abonnement | Contrat | Identifiants Stripe, statut abonnement | Durée relation + obligations comptables | Stripe |
| E-mails transactionnels (compte, alertes) | Contrat | E-mail, contenu notification | Logs techniques ≤ 12 mois | Resend |
| Support | Intérêt légitime | Échanges support | 12 mois | E-mail |
| Sécurité / logs | Intérêt légitime | IP, logs techniques | 12 mois max | Vercel, Supabase |
| Statistiques produit | Consentement (cookies) | Pages vues, identifiant pseudo-anonyme | 12 mois | PostHog (si activé) |
| Consentements | Obligation / contrat | Horodatage CGU, version politique, cookies | Preuve : durée relation + 3 ans | Supabase |

---

## 3. Traitements — sous-traitance (clients finaux des artisans)

Flowo agit en **sous-traitant** (art. 28 RGPD) pour les données que l'artisan saisit concernant **ses** clients.

| Finalité | Responsable de traitement | Données | Durée | Accord |
|----------|---------------------------|---------|-------|--------|
| CRM client, devis, envoi e-mail client | L'artisan utilisateur | Coordonnées client, contenu devis/facture | Durée du compte artisan ; effacement à la suppression | `/legal/sous-traitance` + CGU |

---

## 4. Sous-traitants ultérieurs (prestataires Flowo)

| Prestataire | Rôle | Localisation | DPA |
|-------------|------|--------------|-----|
| Supabase | Auth, BDD, fichiers | UE / USA (région projet) | Archivé 28/07/2026 |
| Vercel | Hébergement web | UE / USA | Archivé 28/07/2026 |
| Stripe | Paiements | UE / USA | Archivé 28/07/2026 |
| Resend | E-mails | USA | Archivé 28/07/2026 |
| Anthropic | IA Zeus | USA | Archivé 28/07/2026 |
| Twilio | SMS/WhatsApp (si activé) | USA | Si activé |
| PostHog | Analytics (si consentement) | UE recommandé | Si activé |

DPA détaillés : voir `docs/DPA-CHECKLIST.md` et dossier local `DPA Flowo/`.

---

## 5. Transferts hors Union européenne

Transferts vers USA (Anthropic, Resend, Stripe, etc.) encadrés par les **DPA** des prestataires et, le cas échéant, **Clauses Contractuelles Types** (SCC).

Mesures : choix de région UE Supabase lorsque possible ; PostHog EU ; minimisation des données envoyées à l'IA.

---

## 6. Droits des personnes

| Droit | Modalité Flowo |
|-------|----------------|
| Accès / portabilité | Compte → Sécurité → Export JSON ; e-mail support |
| Rectification | Compte → Profil / Entreprise |
| Effacement | Compte → Sécurité → Suppression compte |
| Opposition / limitation | flowo.contact@gmail.com |
| Cookies | Bannière + Compte → Sécurité |
| Réclamation | CNIL — www.cnil.fr |

---

## 7. Sécurité

- HTTPS, authentification Supabase, RLS par `user_id`
- Secrets en variables d'environnement (Vercel)
- Accès admin limité (FLOWO_ADMIN_EMAILS)
- Sauvegardes : politique Supabase / hébergeur

---

## 8. Violations de données

Procédure : notification CNIL sous 72 h si risque pour les droits ; information des personnes concernées si risque élevé ; notification des artisans responsables de traitement pour les données de leurs clients.

Contact interne : flowo.contact@gmail.com.

---

## 9. Révisions

| Date | Modification |
|------|--------------|
| 2026-07-14 | Première version RGPD (pages légales, cookies) |
| 2026-07-28 | CGU étendues, accord sous-traitance public, registre formalisé |
