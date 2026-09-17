-- Analytics anonymes : alimenté par POST /api/track (Flowo prod), lu par le dashboard App Data flowo.

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
