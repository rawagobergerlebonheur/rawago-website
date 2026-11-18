-- RAWAGO : passage du paiement immédiat à une demande préalable sans paiement.
-- À exécuter une seule fois dans Supabase SQL Editor.
-- Les commandes historiques sont conservées ; seuls les nouveaux statuts/options sont autorisés.

ALTER TABLE public.book_orders
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN currency DROP NOT NULL;

ALTER TABLE public.book_orders
  DROP CONSTRAINT IF EXISTS book_orders_status_check;
ALTER TABLE public.book_orders
  ADD CONSTRAINT book_orders_status_check
  CHECK (status IN (
    'pending_payment', 'request_received', 'availability_confirmed',
    'payment_pending', 'paid', 'fulfilled', 'unavailable', 'cancelled'
  ));

ALTER TABLE public.book_orders
  DROP CONSTRAINT IF EXISTS book_orders_payment_method_check;
ALTER TABLE public.book_orders
  ADD CONSTRAINT book_orders_payment_method_check
  CHECK (preferred_payment_method IN (
    'wave', 'orange_money', 'bank_transfer', 'paypal', 'taptap_send', 'to_discuss'
  ));

-- Les nouveaux membres peuvent uniquement déposer une demande non payée.
DROP POLICY IF EXISTS "book_orders_member_insert_own" ON public.book_orders;
CREATE POLICY "book_orders_member_insert_own"
ON public.book_orders
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'request_received'
  AND amount IS NULL
  AND currency IS NULL
);

-- Pas de politique UPDATE pour les membres : seuls les administrateurs peuvent modifier le suivi.
