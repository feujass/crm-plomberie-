-- PlombiCRM schéma initial + RLS + Storage
-- Exécuter sur un projet Supabase (SQL editor ou CLI).
--
-- Si erreur « client_id uuid vs id bigint » : une ancienne table `clients` (BIGSERIAL)
-- est encore présente. Exécuter d’abord la migration
-- `20260411185900_prepare_legacy_clients_for_uuid.sql`, puis relancer celle-ci.

-- ---------------------------------------------------------------------------
-- Profils (1:1 auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text,
  nom text,
  entreprise_nom text,
  logo_url text,
  siret text,
  adresse text,
  tel text,
  email_facturation text,
  tva_defaut numeric(5,2) not null default 10,
  sep_fourniture_pose boolean not null default false,
  structure_devis text not null default 'libre'
    check (structure_devis in ('piece', 'type_travaux', 'libre')),
  mention_legale text,
  conditions_paiement_defaut text,
  onboarding_steps_completed int not null default 0 check (onboarding_steps_completed between 0 and 3),
  assistant_name text not null default 'Zeus',
  tarif_horaire numeric(12,2),
  relance_devis_jours int not null default 5,
  relance_facture_jours int not null default 5,
  pdf_primary_color text default '#0369a1',
  notification_email boolean not null default true,
  notification_push boolean not null default false,
  stripe_customer_id text,
  subscription_plan text default 'free' check (subscription_plan in ('free', 'pro')),
  subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nom text not null,
  prenom text,
  email text,
  tel text,
  adresse text,
  type text not null default 'particulier' check (type in ('particulier', 'professionnel')),
  siret text,
  notes text,
  inactive boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients (user_id);

-- ---------------------------------------------------------------------------
-- Ouvrages (catalogue)
-- ---------------------------------------------------------------------------
create table if not exists public.ouvrages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nom text not null,
  description text,
  type text not null check (type in ('main_oeuvre', 'fourniture', 'ouvrage')),
  prix_ht numeric(12,2) not null default 0,
  unite text not null default 'forfait',
  tva numeric(5,2) not null default 10,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ouvrages_user_id_idx on public.ouvrages (user_id);

-- ---------------------------------------------------------------------------
-- Devis
-- ---------------------------------------------------------------------------
create table if not exists public.devis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  numero text not null,
  statut text not null default 'brouillon'
    check (statut in ('brouillon', 'envoye', 'accepte', 'refuse', 'expire', 'archive')),
  total_ht numeric(14,2) not null default 0,
  total_tva numeric(14,2) not null default 0,
  total_ttc numeric(14,2) not null default 0,
  date_creation timestamptz not null default now(),
  date_envoi timestamptz,
  date_expiration date,
  notes text,
  remise_type text check (remise_type is null or remise_type in ('percent', 'fixed')),
  remise_value numeric(12,2),
  share_token uuid not null default gen_random_uuid() unique,
  pdf_url text,
  derniere_relance_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, numero)
);

create index if not exists devis_user_statut_idx on public.devis (user_id, statut);
create index if not exists devis_user_date_idx on public.devis (user_id, date_creation desc);

drop trigger if exists devis_updated_at on public.devis;
create trigger devis_updated_at before update on public.devis
for each row execute procedure public.set_updated_at();

create table if not exists public.devis_lignes (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis (id) on delete cascade,
  section text,
  designation text not null,
  quantite numeric(12,3) not null default 1,
  unite text not null default 'u',
  prix_ht numeric(12,2) not null default 0,
  tva numeric(5,2) not null default 10,
  total_ht numeric(14,2) not null default 0,
  ordre int not null default 0,
  ligne_type text default 'prestation' check (ligne_type in ('prestation', 'fourniture', 'pose'))
);

create index if not exists devis_lignes_devis_idx on public.devis_lignes (devis_id);

create table if not exists public.devis_notes_internes (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Chantiers
-- ---------------------------------------------------------------------------
create table if not exists public.chantiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  devis_id uuid references public.devis (id) on delete set null,
  nom text not null,
  adresse text,
  statut text not null default 'en_cours'
    check (statut in ('en_cours', 'planifie', 'termine', 'pause')),
  date_debut date,
  date_fin date,
  avancement int not null default 0 check (avancement between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chantiers_user_idx on public.chantiers (user_id);

drop trigger if exists chantiers_updated_at on public.chantiers;
create trigger chantiers_updated_at before update on public.chantiers
for each row execute procedure public.set_updated_at();

create table if not exists public.chantier_photos (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chantier_journal (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  duree_h numeric(8,2),
  description text not null,
  technicien text,
  created_at timestamptz not null default now()
);

create table if not exists public.chantier_documents (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  label text,
  url text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Facturation
-- ---------------------------------------------------------------------------
create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  devis_id uuid references public.devis (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  numero text not null,
  statut text not null default 'brouillon'
    check (statut in ('brouillon', 'emise', 'partielle', 'payee', 'retard')),
  date_emission date not null default (now() at time zone 'utc')::date,
  date_echeance date,
  total_ht numeric(14,2) not null default 0,
  total_tva numeric(14,2) not null default 0,
  total_ttc numeric(14,2) not null default 0,
  share_token uuid not null default gen_random_uuid() unique,
  pdf_url text,
  derniere_relance_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, numero)
);

create index if not exists factures_user_idx on public.factures (user_id);

drop trigger if exists factures_updated_at on public.factures;
create trigger factures_updated_at before update on public.factures
for each row execute procedure public.set_updated_at();

create table if not exists public.facture_lignes (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures (id) on delete cascade,
  section text,
  designation text not null,
  quantite numeric(12,3) not null default 1,
  unite text not null default 'u',
  prix_ht numeric(12,2) not null default 0,
  tva numeric(5,2) not null default 10,
  total_ht numeric(14,2) not null default 0,
  ordre int not null default 0
);

create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures (id) on delete cascade,
  montant numeric(14,2) not null,
  date date not null default (now() at time zone 'utc')::date,
  mode text not null check (mode in ('virement', 'cheque', 'especes', 'cb', 'autre')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Assistant IA chat
-- ---------------------------------------------------------------------------
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_session_idx on public.ai_chat_messages (session_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.ouvrages enable row level security;
alter table public.devis enable row level security;
alter table public.devis_lignes enable row level security;
alter table public.devis_notes_internes enable row level security;
alter table public.chantiers enable row level security;
alter table public.chantier_photos enable row level security;
alter table public.chantier_journal enable row level security;
alter table public.chantier_documents enable row level security;
alter table public.factures enable row level security;
alter table public.facture_lignes enable row level security;
alter table public.paiements enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

-- Profiles : lecture/écriture propriétaire
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- Clients
create policy clients_all_own on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ouvrages
create policy ouvrages_all_own on public.ouvrages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Devis
create policy devis_all_own on public.devis for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy devis_lignes_all on public.devis_lignes for all
  using (exists (select 1 from public.devis d where d.id = devis_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.devis d where d.id = devis_id and d.user_id = auth.uid()));

create policy devis_notes_all on public.devis_notes_internes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chantiers
create policy chantiers_all_own on public.chantiers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy chantier_photos_all on public.chantier_photos for all
  using (exists (select 1 from public.chantiers c where c.id = chantier_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.chantiers c where c.id = chantier_id and c.user_id = auth.uid()));

create policy chantier_journal_all on public.chantier_journal for all
  using (auth.uid() = user_id and exists (select 1 from public.chantiers c where c.id = chantier_id and c.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.chantiers c where c.id = chantier_id and c.user_id = auth.uid()));

create policy chantier_docs_all on public.chantier_documents for all
  using (exists (select 1 from public.chantiers c where c.id = chantier_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.chantiers c where c.id = chantier_id and c.user_id = auth.uid()));

-- Factures
create policy factures_all_own on public.factures for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy facture_lignes_all on public.facture_lignes for all
  using (exists (select 1 from public.factures f where f.id = facture_id and f.user_id = auth.uid()))
  with check (exists (select 1 from public.factures f where f.id = facture_id and f.user_id = auth.uid()));

create policy paiements_all on public.paiements for all
  using (exists (select 1 from public.factures f where f.id = facture_id and f.user_id = auth.uid()))
  with check (exists (select 1 from public.factures f where f.id = facture_id and f.user_id = auth.uid()));

-- AI
create policy ai_sessions_own on public.ai_chat_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy ai_messages_own on public.ai_chat_messages for all
  using (exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage buckets + policies (chemins: {user_id}/...)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('chantiers', 'chantiers', false), ('devis-imports', 'devis-imports', false)
on conflict (id) do nothing;

create policy "logos read" on storage.objects for select using (bucket_id = 'logos');
create policy "logos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);
create policy "logos update own" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);
create policy "logos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);

create policy "chantiers read own" on storage.objects for select to authenticated
  using (bucket_id = 'chantiers' and split_part(name, '/', 1) = auth.uid()::text);
create policy "chantiers insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'chantiers' and split_part(name, '/', 1) = auth.uid()::text);
create policy "chantiers update own" on storage.objects for update to authenticated
  using (bucket_id = 'chantiers' and split_part(name, '/', 1) = auth.uid()::text);
create policy "chantiers delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'chantiers' and split_part(name, '/', 1) = auth.uid()::text);

create policy "devis-imports read own" on storage.objects for select to authenticated
  using (bucket_id = 'devis-imports' and split_part(name, '/', 1) = auth.uid()::text);
create policy "devis-imports insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'devis-imports' and split_part(name, '/', 1) = auth.uid()::text);
create policy "devis-imports delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'devis-imports' and split_part(name, '/', 1) = auth.uid()::text);
