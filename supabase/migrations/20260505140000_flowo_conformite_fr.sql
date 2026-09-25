-- Flowo — champs conformité facturation / devis (France) + tables audit & transmissions
-- À appliquer sur les projets Supabase utilisant le schéma PlombiCRM initial.

-- Profil entreprise
alter table public.profiles add column if not exists siren text;
alter table public.profiles add column if not exists forme_juridique text;
alter table public.profiles add column if not exists capital_social text;
alter table public.profiles add column if not exists rcs_ville text;
alter table public.profiles add column if not exists numero_tva_intracom text;
alter table public.profiles add column if not exists tva_sur_encaissements boolean default true;
alter table public.profiles add column if not exists tva_sur_debits_opt_in boolean default false;
alter table public.profiles add column if not exists decennale_mention text;
alter table public.profiles add column if not exists iban text;
alter table public.profiles add column if not exists bic text;
alter table public.profiles add column if not exists feature_flag_pdp boolean default true;
alter table public.profiles add column if not exists feature_flag_ereporting boolean default true;
alter table public.profiles add column if not exists feature_flag_chorus boolean default true;
alter table public.profiles add column if not exists feature_flag_esign_advanced boolean default true;

-- Clients
alter table public.clients add column if not exists siren text;
alter table public.clients add column if not exists tva_intracom text;
alter table public.clients add column if not exists categorie_fiscale text default 'particulier';
alter table public.clients add column if not exists secteur_public boolean default false;
alter table public.clients add column if not exists chorus_service_code text;

-- Devis
alter table public.devis add column if not exists adresse_chantier text;
alter table public.devis add column if not exists esign_provider text;
alter table public.devis add column if not exists esign_envelope_id text;
alter table public.devis add column if not exists esign_status text;
alter table public.devis add column if not exists esign_signed_at timestamptz;
alter table public.devis add column if not exists esign_proof jsonb;

-- Factures
alter table public.factures add column if not exists operations_type text default 'services';
alter table public.factures add column if not exists facture_type text default 'standard';
alter table public.factures add column if not exists adresse_livraison_chantier text;
alter table public.factures add column if not exists date_prestation_debut date;
alter table public.factures add column if not exists date_prestation_fin date;
alter table public.factures add column if not exists conformite_branche text;
alter table public.factures add column if not exists conformite_warnings jsonb default '[]';
alter table public.factures add column if not exists chorus_service_code text;
alter table public.factures add column if not exists immutable boolean default true;
alter table public.factures add column if not exists locked_at timestamptz;

create table if not exists public.compliance_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists compliance_audit_user_created_idx
  on public.compliance_audit_events (user_id, created_at desc);

create table if not exists public.compliance_transmissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  facture_id uuid references public.factures (id) on delete cascade,
  kind text not null,
  status text not null,
  detail text,
  payload_snapshot jsonb,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compliance_trans_user_created_idx
  on public.compliance_transmissions (user_id, created_at desc);
create index if not exists compliance_trans_user_facture_idx
  on public.compliance_transmissions (user_id, facture_id);

alter table public.compliance_audit_events enable row level security;
alter table public.compliance_transmissions enable row level security;

drop policy if exists compliance_audit_own on public.compliance_audit_events;
create policy compliance_audit_own on public.compliance_audit_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists compliance_trans_own on public.compliance_transmissions;
create policy compliance_trans_own on public.compliance_transmissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
