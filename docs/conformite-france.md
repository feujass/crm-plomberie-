# Conformité facturation & devis — France (Flowo)

Ce document résume l’implémentation produit **Flowo** pour la France (BTP, B2B + B2C), sans se substituer à un avis juridique ou fiscal.

## Réforme 2026–2027 (e-invoicing / e-reporting)

- **B2B** entre assujettis TVA en France : **facture électronique** via une **PDP** (Plateforme de Dématérialisation Partenaire).
- **B2C**, international, certains hors-champ : **e-reporting** (données de transaction) via la PDP.
- **Secteur public** : dépôt **Chorus Pro** (souvent en parallèle d’autres obligations).

### Comportement dans Flowo (backend)

- À la **création d’une facture** depuis un devis, Flowo calcule une **branche** (`conformite_branche`) et crée des enregistrements **`transmissions`** (simulation ou « configuration requise »).
- Variables d’environnement backend (`backend/.env`) :
  - `PDP_SIMULATE` (défaut `true`) : aucun appel réel ; statut `simulated_ok`.
  - `PDP_API_URL` + `PDP_API_KEY` : préparation pour intégration réelle (statut `pending_send` si `PDP_SIMULATE=false`).

## Données obligatoires / recommandées

- **Profil entreprise** : SIRET, SIREN, TVA intracom si assujetti, IBAN, mentions légales, conditions de paiement (pénalités + 40 € B2B).
- **Client** : type, catégorie fiscale, SIRET/SIREN pour les pros, flag **secteur public**, code service Chorus si besoin.
- **Facture** : numéro, lignes, totaux, type d’opérations (`biens` | `services` | `mixte`), adresse de chantier / livraison si différente.

## Signature électronique avancée (devis)

- Endpoint stub : `PUT /api/devis/{id}/esign-stub` avec `action`: `init` | `mark_signed` | `reset`.
- À remplacer par un prestataire **eIDAS** (Yousign, DocuSign, etc.) : enveloppe, webhook, preuves.

## Archivage & audit

- `GET /api/conformite/archive` : export JSON (factures, transmissions, audit, devis).
- Collection MongoDB `audit_events` : journal des actions sensibles.

## Fichiers clés

- `backend/conformite.py` — règles pures (classification, validation, snapshots).
- `backend/server.py` — API, création des `transmissions`, audit.
- `lib/conformite/` — libellés UI.
