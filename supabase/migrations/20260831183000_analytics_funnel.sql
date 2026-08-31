-- Funnel analytics : attribution session + événements nommés

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
