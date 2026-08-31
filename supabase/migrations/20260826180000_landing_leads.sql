-- Leads landing : tentatives connexion/inscription depuis flowo.agency
-- Alimenté par POST /api/auth/login et /api/auth/register, lu par App Data flowo.

create table if not exists public.landing_leads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  source_page text not null check (source_page in ('login', 'register')),
  email text not null,
  prenom text,
  nom text,
  tel text,
  entreprise text,
  metier text,
  siret text,
  adresse text,
  siren text,
  forme_juridique text,
  capital_social text,
  rcs_ville text,
  numero_tva_intracom text,
  email_facturation text,
  success boolean not null default false,
  error_message text,
  country text,
  created_at timestamptz not null default now()
);

create index if not exists landing_leads_created_at_idx
  on public.landing_leads (created_at desc);

create index if not exists landing_leads_email_idx
  on public.landing_leads (lower(email), created_at desc);

create index if not exists landing_leads_source_page_idx
  on public.landing_leads (source_page, created_at desc);

create index if not exists landing_leads_success_idx
  on public.landing_leads (success, created_at desc);

comment on table public.landing_leads is 'Leads landing Flowo — tentatives login/register pour suivi marketing (App Data flowo)';

alter table public.landing_leads enable row level security;
