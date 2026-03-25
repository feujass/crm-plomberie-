# Backend - Installation rapide

## Pré-requis
- Node.js 18+
- Un projet Supabase (gratuit)

## Démarrage local
1. Ouvrez un terminal dans le dossier `CRM`.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Créez un fichier `.env` :
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   JWT_SECRET=une_chaine_secrete
   BASE_URL=http://localhost:3000
   ```
4. Lancez le serveur :
   ```bash
   npm start
   ```
5. Ouvrez `http://localhost:3000` dans votre navigateur.

## Compte unique
- Identifiant : `CRMplomberie`
- Mot de passe : `911schepor`

## Variables d'environnement

### Base de données (obligatoire)
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service_role de Supabase

### Email (optionnel)
- `SMTP_HOST` : Serveur SMTP (ex: smtp.gmail.com)
- `SMTP_PORT` : Port SMTP (ex: 587)
- `SMTP_USER` : Identifiant SMTP
- `SMTP_PASS` : Mot de passe SMTP
- `SMTP_FROM` : Adresse d'envoi

### Google Calendar (optionnel)
- `GOOGLE_CLIENT_ID` : ID client OAuth Google
- `GOOGLE_CLIENT_SECRET` : Secret client OAuth Google
- `GOOGLE_REDIRECT_URI` : URI de redirection OAuth

### Entreprise
- `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`, `COMPANY_EMAIL`

## Déploiement Vercel
Le projet est configuré pour Vercel. Connectez le repo GitHub à Vercel,
ajoutez les variables d'environnement ci-dessus, et déployez.
