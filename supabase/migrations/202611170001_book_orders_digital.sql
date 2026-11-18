-- RAWAGO : commandes numériques et confidentialité des coordonnées de paiement.
-- À exécuter dans Supabase SQL Editor après sauvegarde de la base.

create table if not exists public.book_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid,
  book_title text not null,
  book_authors text[] not null default '{}',
  book_publisher text,
  book_isbn text,
  book_category text,
  book_cover_url text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_country text not null,
  preferred_payment_method text not null check (preferred_payment_method in ('wave','orange_money','taptap_send','paypal')),
  book_format text not null check (book_format in ('PDF','EPUB')),
  amount numeric(10,2) not null,
  currency text not null check (currency in ('XOF','USD')),
  transfer_reference text,
  customer_note text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','fulfilled','cancelled')),
  payment_transaction_id text,
  paid_at timestamptz,
  delivered_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.book_orders add column if not exists book_format text;
alter table public.book_orders add column if not exists amount numeric(10,2);
alter table public.book_orders add column if not exists currency text;
alter table public.book_orders add column if not exists transfer_reference text;
alter table public.book_orders add column if not exists payment_transaction_id text;
alter table public.book_orders add column if not exists paid_at timestamptz;
alter table public.book_orders add column if not exists delivered_at timestamptz;


-- Supprimer les anciennes contraintes de statut/moyen de paiement issues du parcours de devis.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.book_orders'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%status%' or pg_get_constraintdef(oid) ilike '%preferred_payment_method%')
  loop
    execute format('alter table public.book_orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.book_orders
  add constraint book_orders_status_check
  check (status in ('pending_payment','paid','fulfilled','cancelled'));

alter table public.book_orders
  add constraint book_orders_payment_method_check
  check (preferred_payment_method in ('wave','orange_money','taptap_send','paypal'));

alter table public.book_orders enable row level security;

drop policy if exists "book_orders_member_read_own" on public.book_orders;
create policy "book_orders_member_read_own" on public.book_orders
for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "book_orders_member_insert_own" on public.book_orders;
create policy "book_orders_member_insert_own" on public.book_orders
for insert to authenticated
with check (user_id = auth.uid() and status = 'pending_payment');

drop policy if exists "book_orders_admin_update" on public.book_orders;
create policy "book_orders_admin_update" on public.book_orders
for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists book_orders_user_created_idx on public.book_orders(user_id, created_at desc);
create index if not exists book_orders_status_created_idx on public.book_orders(status, created_at desc);

-- Les coordonnées privées ne sont PAS stockées dans une table lisible par anon.
-- Elles sont renvoyées uniquement par l'Edge Function authentifiée payment-instructions.
