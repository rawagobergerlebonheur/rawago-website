-- Schéma initial indicatif pour Supabase. À exécuter après création du projet.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_language text not null default 'fr' check (preferred_language in ('fr','en')),
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  service_type text,
  description text not null,
  status text not null default 'received' check (status in ('received','reviewing','quoted','accepted','closed')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.service_requests enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
-- Les rôles administrateur seront gérés côté serveur; aucun client ne peut modifier ses privilèges.
create policy "requests: read own" on public.service_requests
  for select using (user_id = auth.uid());
-- L'insertion publique doit être réalisée via une fonction serveur protégée contre le spam,
-- ou une Edge Function avec validation. Ne pas ouvrir une policy INSERT sans stratégie anti-abus.
