-- Programme d'affiliation Flowo : partenaires, clics, parrainages, commissions.

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

create policy affiliate_partners_select_own on public.affiliate_partners
  for select using (auth.uid() = user_id);

create policy affiliate_clicks_select_own on public.affiliate_clicks
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

create policy affiliate_referrals_select_own on public.affiliate_referrals
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );

create policy affiliate_commissions_select_own on public.affiliate_commissions
  for select using (
    partner_id in (select id from public.affiliate_partners where user_id = auth.uid())
  );
