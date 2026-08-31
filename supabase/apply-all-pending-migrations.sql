-- =============================================================================
-- Flowo — appliquer toutes les migrations manquantes en une fois
-- =============================================================================
-- 1. Ouvre : https://supabase.com/dashboard/project/uvgjcozdqxnrnfmkmlwa/sql/new
-- 2. Colle tout ce fichier
-- 3. Clique « Run »
--
-- Idempotent : peut être relancé sans casser si une partie est déjà appliquée.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 20260609120000 — Assistant Zeus
-- -----------------------------------------------------------------------------
alter table public.profiles alter column assistant_name set default 'Zeus';

update public.profiles
set assistant_name = 'Zeus'
where assistant_name is null or trim(assistant_name) = '' or lower(trim(assistant_name)) = 'rita';

-- -----------------------------------------------------------------------------
-- 20260609130000 — Préférences de notification
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- 20260609140000 — Compteur usage IA devis
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists ia_devis_month text,
  add column if not exists ia_devis_count int not null default 0;

-- -----------------------------------------------------------------------------
-- 20260609150000 — Essai gratuit (trial_ends_at)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

-- -----------------------------------------------------------------------------
-- 20260628160000 — Relances multiples
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists relance_devis_echeances text not null default '3,7,14';

alter table public.profiles
  add column if not exists relance_facture_echeances text not null default '0,7,14';

alter table public.devis
  add column if not exists relance_count int not null default 0;

alter table public.factures
  add column if not exists relance_count int not null default 0;

update public.devis
set relance_count = 1
where derniere_relance_at is not null and relance_count = 0;

update public.factures
set relance_count = 1
where derniere_relance_at is not null and relance_count = 0;

alter table public.profiles
  alter column relance_devis_jours set default 3;

-- -----------------------------------------------------------------------------
-- 20260705220000 — Avatar profil
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'URL photo de profil (Storage logos ou URL externe)';

-- -----------------------------------------------------------------------------
-- 20260710100000 — Bucket logos privé
-- -----------------------------------------------------------------------------
update storage.buckets set public = false where id = 'logos';

drop policy if exists "logos read" on storage.objects;
drop policy if exists "logos read own" on storage.objects;

create policy "logos read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and split_part(name, '/', 1) = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- 20260714170000 — Consentement RGPD
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_policy_version text;

comment on column public.profiles.privacy_accepted_at is 'Horodatage acceptation CGU / politique de confidentialité';
comment on column public.profiles.privacy_policy_version is 'Version de la politique acceptée (ex. 2026-07-14)';

-- -----------------------------------------------------------------------------
-- 20260714180000 — Programme d'affiliation (phase 1)
-- -----------------------------------------------------------------------------
create table if not exists public.affiliate_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null,
  display_name text not null,
  brand_name text not null,
  referral_code text not null unique,
  slug text not null unique,
  commission_rate_percent numeric(5, 2) not null default 20.00,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  payout_min_eur numeric(10, 2) not null default 50,
  total_earned_eur numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_partners_code_idx on public.affiliate_partners (referral_code);
create index if not exists affiliate_partners_slug_idx on public.affiliate_partners (slug);
create index if not exists affiliate_partners_user_idx on public.affiliate_partners (user_id);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  landing_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_partner_created_idx on public.affiliate_clicks (partner_id, created_at desc);

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  referred_user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'trialing', 'subscribed', 'churned')),
  subscribed_plan text,
  created_at timestamptz not null default now(),
  converted_at timestamptz
);

create index if not exists affiliate_referrals_partner_idx on public.affiliate_referrals (partner_id, created_at desc);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  referred_user_id uuid references auth.users (id) on delete set null,
  stripe_invoice_id text unique,
  gross_amount_eur numeric(12, 2) not null,
  commission_eur numeric(12, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  period_start timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_commissions_partner_idx on public.affiliate_commissions (partner_id, created_at desc);

alter table public.profiles
  add column if not exists referred_by_partner_id uuid references public.affiliate_partners (id) on delete set null;

comment on table public.affiliate_partners is 'Comptes partenaires affiliation Flowo';
comment on column public.profiles.referred_by_partner_id is 'Partenaire ayant parrainé cet artisan';

drop trigger if exists affiliate_partners_updated_at on public.affiliate_partners;
create trigger affiliate_partners_updated_at before update on public.affiliate_partners
  for each row execute function public.set_updated_at();

alter table public.affiliate_partners enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;

drop policy if exists affiliate_partners_select_own on public.affiliate_partners;
create policy affiliate_partners_select_own on public.affiliate_partners
  for select using (auth.uid() = user_id);

drop policy if exists affiliate_clicks_select_own on public.affiliate_clicks;
create policy affiliate_clicks_select_own on public.affiliate_clicks
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

drop policy if exists affiliate_referrals_select_own on public.affiliate_referrals;
create policy affiliate_referrals_select_own on public.affiliate_referrals
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

drop policy if exists affiliate_commissions_select_own on public.affiliate_commissions;
create policy affiliate_commissions_select_own on public.affiliate_commissions
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 20260714190000 — Affiliation phase 2 (candidatures, Stripe Connect, virements)
-- -----------------------------------------------------------------------------
create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text not null,
  brand_name text not null,
  phone text,
  audience_type text not null check (audience_type in ('formateur', 'influenceur', 'fournisseur', 'coach', 'autre')),
  audience_size text,
  website_or_social text,
  pitch text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  partner_id uuid references public.affiliate_partners (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_applications_email_idx on public.affiliate_applications (email);
create index if not exists affiliate_applications_status_idx on public.affiliate_applications (status, created_at desc);

alter table public.affiliate_partners
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarded boolean not null default false,
  add column if not exists phone text;

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  amount_eur numeric(12, 2) not null,
  stripe_transfer_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_payouts_partner_idx on public.affiliate_payouts (partner_id, created_at desc);

alter table public.affiliate_applications enable row level security;

alter table public.affiliate_payouts enable row level security;

drop policy if exists affiliate_payouts_select_own on public.affiliate_payouts;
create policy affiliate_payouts_select_own on public.affiliate_payouts
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

-- =============================================================================
-- Fin — recharge localhost:3000 et réessaie l'inscription / affiliation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 20260729120000 — Plans Pro+ et PME (webhooks Stripe)
-- -----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'pro', 'pro_plus', 'pme'));

-- -----------------------------------------------------------------------------
-- 20260729160000 — Analytics parcours (dashboard App Data flowo)
-- -----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_type text not null check (event_type in ('page_view', 'page_exit')),
  page_path text not null,
  country text,
  referrer text,
  time_on_page_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_page_path_idx
  on public.analytics_events (page_path, event_type);

create index if not exists analytics_events_country_idx
  on public.analytics_events (country, created_at desc)
  where country is not null;

comment on table public.analytics_events is 'Analytics anonymes Flowo — alimenté par /api/track, lu par App Data flowo (local)';

alter table public.analytics_events enable row level security;

-- -----------------------------------------------------------------------------
-- 20260826180000 — Leads landing (login / register)
-- -----------------------------------------------------------------------------
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


-- 20260831180000 — Dashboard analytics (UTM, ad_spend, milestones)
-- Dashboard Flowo Analytics : colonnes UTM/device, tables ad_spend & milestones.
-- Aucune table métier CRM n'est modifiée.

alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events add column if not exists utm_source text;
alter table public.analytics_events add column if not exists utm_medium text;
alter table public.analytics_events add column if not exists utm_campaign text;
alter table public.analytics_events add column if not exists utm_content text;
alter table public.analytics_events add column if not exists utm_term text;
alter table public.analytics_events add column if not exists device text;
alter table public.analytics_events add column if not exists user_agent text;
alter table public.analytics_events add column if not exists user_id uuid;
alter table public.analytics_events add column if not exists is_internal boolean;
alter table public.analytics_events add column if not exists field text;
alter table public.analytics_events add column if not exists value_filled boolean;
alter table public.analytics_events add column if not exists properties jsonb;

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, created_at);

create index if not exists analytics_events_type_created_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_utm_source_idx
  on public.analytics_events (utm_source, created_at desc)
  where utm_source is not null;

create table if not exists public.analytics_ad_spend (
  campaign text not null,
  period_days integer not null check (period_days in (7, 30, 90)),
  amount numeric(12,2) not null check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (campaign, period_days)
);

comment on table public.analytics_ad_spend is 'Budgets publicitaires saisis dans Flowo Analytics — hors tables métier CRM';

alter table public.analytics_ad_spend enable row level security;

create table if not exists public.analytics_milestones (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  label text not null,
  created_at timestamptz not null default now()
);

comment on table public.analytics_milestones is 'Repères de campagne / produit pour le dashboard Flowo Analytics';

alter table public.analytics_milestones enable row level security;

create index if not exists analytics_milestones_date_idx
  on public.analytics_milestones (date);

create or replace function public.analytics_page_view_counts(
  p_since timestamptz,
  p_until timestamptz
)
returns table(page_path text, views bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select page_path, count(*)::bigint as views
  from public.analytics_events
  where event_type = 'page_view'
    and created_at >= p_since
    and created_at < p_until
  group by page_path
  order by views desc;
$$;

revoke all on function public.analytics_page_view_counts(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.analytics_page_view_counts(timestamptz, timestamptz) to service_role;


-- 20260831183000 — Funnel analytics (sessions + événements nommés)

create table if not exists public.analytics_sessions (
  session_id uuid primary key,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  referrer_domain text,
  landing_path text,
  device_type text,
  viewport_width integer,
  created_at timestamptz not null default now()
);

alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add column if not exists properties jsonb;

alter table public.analytics_events
  add constraint analytics_events_event_type_check check (
    event_type in (
      'page_view',
      'page_exit',
      'landing_view',
      'cta_click',
      'video_play',
      'video_25',
      'video_50',
      'video_75',
      'video_complete',
      'pricing_view',
      'register_view',
      'register_submit',
      'register_error',
      'register_success',
      'field_focus',
      'field_blur',
      'onboarding_profile_complete',
      'first_devis_created',
      'first_devis_sent',
      'trial_expired',
      'subscription_started'
    )
  );

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type, created_at desc);

comment on table public.analytics_sessions is 'Attribution UTM/referrer/device par session analytics (1ʳᵉ page vue)';

alter table public.analytics_sessions enable row level security;
