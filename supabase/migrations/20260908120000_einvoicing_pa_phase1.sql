-- Phase 1 PA : raccordement OAuth par artisan, jetons chiffrés, événements de cycle append-only.
-- Aucun appel réseau dans le code applicatif à ce stade (MockProvider).

-- Périodicité de déclaration PPF (mensuel / trimestriel / simplifié). Nullable : on ne l'a pas encore.
alter table public.profiles
  add column if not exists tva_periodicite_declaration text;

alter table public.profiles drop constraint if exists profiles_tva_periodicite_declaration_check;
alter table public.profiles
  add constraint profiles_tva_periodicite_declaration_check
  check (
    tva_periodicite_declaration is null
    or tva_periodicite_declaration in ('monthly', 'quarterly', 'simplified')
  );

comment on column public.profiles.tva_periodicite_declaration is
  'Périodicité de déclaration e-reporting Super PDP (vat_regime). Distinct du régime d''exigibilité regime_tva.';

alter table public.factures
  add column if not exists einvoicing_provider_invoice_id text;

comment on column public.factures.einvoicing_provider_invoice_id is
  'Identifiant facture côté PA. Sert à rattacher les événements de cycle de vie.';

create unique index if not exists factures_einvoicing_provider_invoice_id_uidx
  on public.factures (einvoicing_provider_invoice_id)
  where einvoicing_provider_invoice_id is not null;

-- ---------------------------------------------------------------------------
-- Raccordement (sans secret)
-- ---------------------------------------------------------------------------
create table if not exists public.einvoicing_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'mock',
  status text not null default 'disconnected'
    check (status in (
      'disconnected',
      'pending_verification',
      'needs_review',
      'verified',
      'failed',
      'token_expired'
    )),
  provider_company_id text,
  company_verification_status text
    check (
      company_verification_status is null
      or company_verification_status in ('pending', 'verified', 'needs_review', 'failed')
    ),
  last_error text,
  last_invoice_event_id text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.einvoicing_connections is
  'Raccordement PA par artisan. Pas de client_id : une seule application Flowo + tokens OAuth.';

alter table public.einvoicing_connections enable row level security;

drop policy if exists einvoicing_connections_own on public.einvoicing_connections;
create policy einvoicing_connections_own on public.einvoicing_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Jetons OAuth chiffrés au repos (AES-256-GCM applicatif)
-- ---------------------------------------------------------------------------
create table if not exists public.einvoicing_oauth_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'mock',
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

comment on table public.einvoicing_oauth_tokens is
  'Access/refresh tokens chiffrés. Jamais loggés. Décryptés uniquement côté serveur.';

alter table public.einvoicing_oauth_tokens enable row level security;

drop policy if exists einvoicing_oauth_tokens_own on public.einvoicing_oauth_tokens;
create policy einvoicing_oauth_tokens_own on public.einvoicing_oauth_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Événements de cycle append-only, idempotents sur (provider, provider_event_id)
-- ---------------------------------------------------------------------------
create table if not exists public.facture_cycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  facture_id uuid not null references public.factures (id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  provider_invoice_id text not null,
  status_code text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists facture_cycle_events_facture_idx
  on public.facture_cycle_events (facture_id, created_at);

alter table public.facture_cycle_events enable row level security;

drop policy if exists facture_cycle_events_own on public.facture_cycle_events;
create policy facture_cycle_events_own on public.facture_cycle_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
