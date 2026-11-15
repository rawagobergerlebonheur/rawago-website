# Berger-Le-Bonheur RAWAGO — version initiale

Site vitrine bilingue français/anglais, construit avec React et Vite.

## Lancer en local
1. Installer Node.js (version LTS) : https://nodejs.org/
2. Dans ce dossier, exécuter `npm install`
3. Exécuter `npm run dev`
4. Pour vérifier la compilation : `npm run build`

## Publication gratuite
Importer le contenu de ce dossier dans le dépôt GitHub `rawago-website`, puis connecter ce dépôt à Cloudflare Pages avec :
- Framework preset : Vite
- Build command : `npm run build`
- Build output directory : `dist`

## À compléter avant ouverture au public
- Ajouter le portrait professionnel validé de Bonheur et les coordonnées officielles.
- Relier le formulaire à un service sécurisé (backend ou fonction serveur) : actuellement il affiche une confirmation locale et n'envoie pas les données.
- Mettre en place authentification, espace client, messagerie, gestion de rendez-vous, paiements et livraison documentaire.
- Remplacer/valider les images illustratives et vérifier les droits d'utilisation avant publication.
- Renseigner les diplômes exacts après validation par Bonheur.

Ne jamais publier de clés secrètes dans le dépôt GitHub.
