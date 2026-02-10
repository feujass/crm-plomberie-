# Backend - Installation rapide

## Pré-requis
- Node.js 18+

## Démarrage
1. Ouvrez un terminal dans le dossier `CRM`.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur :
   ```bash
   npm start
   ```
4. Ouvrez `http://localhost:3000` dans votre navigateur.

## Compte unique
- Identifiant : `CRMplomberie`
- Mot de passe : `911schepor`

## Variables d'environnement (optionnel)
Créez un fichier `.env` à la racine si vous souhaitez configurer l'envoi réel d'emails :
- `PORT=3000`
- `JWT_SECRET=une_chaine_secrete`
- `SMTP_HOST=smtp.exemple.fr`
- `SMTP_PORT=587`
- `SMTP_USER=utilisateur@exemple.fr`
- `SMTP_PASS=motdepasse`
- `SMTP_FROM=PlombiCRM <no-reply@plombicrm.fr>`

Si aucun SMTP n'est défini, le CRM crée le devis mais n'enverra pas d'email réel.

### Google Calendar
Ajoutez aussi les identifiants Google Calendar OAuth :
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://votre-app.onrender.com/auth/google/callback`

Si `GOOGLE_REDIRECT_URI` est absent, le serveur utilise `BASE_URL/auth/google/callback`.
