# RAWAGO — mise à jour commandes numériques

## Changements inclus
- Bibliothèque : affichage des tarifs définis et commande PDF/EPUB.
- Commande : accès réservé aux membres authentifiés.
- Prix affichés : 1 000 XOF pour les pays Sénégal/UEMOA reconnus par le formulaire ; 1,70 USD pour les autres pays.
- Moyens : Wave, Orange Money, TapTap Send ; PayPal est affiché comme choix mais son paiement en ligne reste bloqué tant que l'API sécurisée n'est pas configurée.
- Coordonnées Wave/Orange : servies par une Edge Function authentifiée, jamais intégrées au bundle React.
- Administration : vérification manuelle des transferts et suivi des statuts.

## Installation Supabase
1. Sauvegarder la base de données.
2. Exécuter `supabase/migrations/202611170001_book_orders_digital.sql` dans Supabase SQL Editor.
3. Déployer la fonction `payment-instructions` :
   `supabase functions deploy payment-instructions`
4. Vérifier que l'authentification Supabase est activée et que les profils administrateurs ont `profiles.role = 'admin'`.

La fonction renvoie le numéro `+221770905087` uniquement après validation d'une session membre.

## Limites importantes avant mise en production
- Les paiements Wave, Orange Money et TapTap Send restent des transferts directs : la référence saisie par le client ne prouve pas le crédit. L'administrateur doit vérifier le paiement dans le compte destinataire avant de confirmer.
- PayPal n'est pas encore activé : il faut créer/configurer l'application PayPal et ses identifiants dans des secrets serveur Supabase, puis déployer les fonctions de création/capture et le webhook. Ne jamais placer le secret PayPal dans `VITE_*`, React ou Git.
- La livraison sécurisée PDF/EPUB n'est pas encore implémentée dans ce lot : il faut définir le bucket privé de stockage, les fichiers associés aux livres, la génération de liens signés et le service d'e-mail. Le statut `fulfilled` est pour le moment une mise à jour administrative.
- La migration suppose que la table `profiles` possède déjà une colonne `role`, comme le code d'administration actuel l'utilise. Si cette colonne n'existe pas dans la base, adapter la politique admin avant exécution.
- Les tarifs locaux sont appliqués par reconnaissance du pays saisi dans le formulaire ; pour une mise en production, le pays doit idéalement être normalisé et validé côté serveur.

## Budget
Aucun service payant supplémentaire n'est introduit par ces modifications. PayPal peut déduire des frais de transaction du paiement reçu. Les limites et frais des services utilisés doivent être vérifiés avant activation.
