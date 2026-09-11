-- Phase 2 affiliation : candidatures, Stripe Connect, paiements.

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
