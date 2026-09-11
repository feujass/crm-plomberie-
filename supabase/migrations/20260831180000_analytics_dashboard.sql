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
