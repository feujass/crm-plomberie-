# RGPD — traitement des données (Flowo)

## Finalités

- Exécution du contrat (compte utilisateur, devis, facturation, paiements).
- Obligations légales (conservation des pièces comptables, factures).

## Sous-traitants types

À documenter dans vos DPA : hébergeur, base de données, messagerie (Resend), **PDP** / signature électronique lorsqu’ils sont activés, Stripe si utilisé.

## Durées

- Données de facturation : conservation **au minimum** pour respecter les obligations légales (souvent **6 ans** pour les pièces ; adapter selon votre situation).
- Export : `/api/export/me` et `/api/conformite/archive` permettent une copie des données.

## Droits des personnes

- Accès / rectification : via support ou fonctionnalités compte.
- Suppression : sous réserve des obligations légales de conservation (factures non effaçables avant échéance légale).

## Sécurité

- Authentification par jeton, RLS / isolation par `user_id` côté API.
- Ne pas committer de secrets ; utiliser des variables d’environnement.
