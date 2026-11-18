-- RAWAGO PayPal Sandbox: lien de commande PayPal et idempotence de capture.
ALTER TABLE public.book_orders
  ADD COLUMN IF NOT EXISTS paypal_order_id text;

CREATE UNIQUE INDEX IF NOT EXISTS book_orders_paypal_order_id_uidx
  ON public.book_orders(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- Les colonnes sensibles de paiement ne sont pas modifiables par le client via UPDATE.
-- Les mises à jour de statut PayPal sont réalisées par Edge Function avec la clé service_role.
