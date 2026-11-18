# RAWAGO — installation PayPal Sandbox

Ce paquet ajoute les deux Edge Functions serveur et la migration SQL nécessaires au démarrage d'un paiement PayPal de test à 1,70 USD.

## Important
- Les fonctions utilisent exclusivement l'environnement PayPal Sandbox (`api-m.sandbox.paypal.com`).
- Elles ne rendent pas le bouton PayPal visible dans le site : le composant `BookCheckout.jsx` doit encore être relié à `paypal-create-order` puis à `paypal-capture-order`.
- Le retour PayPal seul ne marque jamais la commande payée. La fonction capture vérifie l'état COMPLETED, la devise USD et le montant exact 1.70.
- Aucun fichier numérique n'est livré par ces fonctions. La livraison privée et l'e-mail seront une étape distincte.

## 1. SQL
Dans Supabase > SQL Editor, exécuter le contenu de `supabase/migrations/202611170002_paypal_orders.sql`.

## 2. Déployer les fonctions
Dans Supabase > Edge Functions, créer et déployer :
- `paypal-create-order` avec `supabase/functions/paypal-create-order/index.ts`
- `paypal-capture-order` avec `supabase/functions/paypal-capture-order/index.ts`

Laisser la vérification JWT activée pour les deux fonctions.

## 3. Secrets
Les secrets déjà créés doivent être les identifiants de l'application PayPal Sandbox :
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

Ne jamais exposer le secret dans le code du navigateur ni dans le dépôt Git.

## 4. Ce qui reste avant le test complet
Le checkout React doit appeler `paypal-create-order`, rediriger vers `approval_url`, puis appeler `paypal-capture-order` au retour avec `order_id` et `paypal_order_id`. Ne pas activer Live avant d'avoir terminé ce branchement et testé avec un compte acheteur Sandbox.
