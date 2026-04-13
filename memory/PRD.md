# PlombiCRM - Product Requirements Document

## Overview
Application SaaS mobile-first destinée aux plombiers (artisans TPE/auto-entrepreneurs). CRM complet combinant génération de devis IA et gestion de clients, factures et catalogue.

## Stack Technique
- **Frontend**: Expo React Native (SDK 54) avec Expo Router (file-based routing)
- **Backend**: FastAPI (Python) avec MongoDB
- **IA**: OpenAI GPT-4o via Emergent LLM Key pour la génération de devis
- **Auth**: JWT Bearer tokens avec bcrypt

## Modules Implémentés (MVP)

### 1. Authentification
- Inscription email/mot de passe
- Connexion avec JWT
- Déconnexion
- Admin auto-seeded (admin@plombicrm.com)

### 2. Onboarding (3 étapes)
- Étape 1: Infos entreprise (nom, SIRET, adresse, téléphone, email)
- Étape 2: Paramètres devis (TVA, séparation fourniture/pose, structure, mentions légales)
- Étape 3: Catalogue de départ (3 ouvrages exemples pré-remplis)

### 3. Dashboard
- Salutation personnalisée
- Bouton CTA "Créer un devis"
- KPIs: Devis du mois, Taux acceptation, CA mois, Montant en attente
- Derniers devis avec statuts colorés
- Relances à faire
- Stats rapides (clients, impayés)

### 4. Gestion des Devis
- Liste avec recherche et filtres par statut
- Création manuelle ligne par ligne
- Création assistée par IA (GPT-4o) - description textuelle → devis structuré
- Détail du devis avec actions: Envoyer, Accepter, Refuser, Facturer
- Calculs automatiques HT/TVA/TTC

### 5. Gestion des Clients (CRM)
- Liste avec recherche
- Création (particulier/professionnel)
- Fiche client avec statistiques (devis, factures, CA total)
- Actions rapides (appeler, email, nouveau devis)

### 6. Catalogue d'Ouvrages
- Liste avec filtres (main d'œuvre/fourniture/ouvrage)
- Création/modification avec type, prix HT, unité, TVA
- Ouvrages par défaut lors de l'onboarding

### 7. Facturation
- Création automatique depuis un devis accepté
- Numérotation automatique (FACT-AAAA-XXXX)
- Suivi des paiements (virement, chèque, espèces, CB)
- Statuts: Émise, Partiellement payée, Payée

## API Endpoints
- Auth: /api/auth/register, /login, /me, /logout
- Profile: /api/profile (GET/PUT)
- Clients: /api/clients (CRUD)
- Devis: /api/devis (CRUD + /lignes)
- Ouvrages: /api/ouvrages (CRUD + /seed-defaults)
- Factures: /api/factures + /from-devis/{id} + /{id}/paiements
- Dashboard: /api/dashboard/stats
- AI: /api/ai/generate-devis, /api/ai/chat

## Design
- Thème: Copper/Orange (#E15C32) sur fond clair (#F4F4F5)
- Navigation: Bottom tabs (5 onglets)
- Style: Utilitaire, haute visibilité, tactile
- Badges colorés pour les statuts
- Interface entièrement en français
