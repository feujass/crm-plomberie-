-- LOT 2 : démo vocale publique (devis preview + rate limit)

create table if not exists public.demo_quotes (
  id uuid primary key default gen_random_uuid(),
  demo_session_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  devis_id uuid,
  transcript text not null,
  quote_json jsonb not null,
  preview_lines jsonb not null default '[]'::jsonb,
  line_count int not null default 0,
  total_ttc numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists demo_quotes_session_idx on public.demo_quotes (demo_session_id, created_at desc);
create index if not exists demo_quotes_user_idx on public.demo_quotes (user_id) where user_id is not null;

comment on table public.demo_quotes is 'Devis générés par la démo vocale landing — contenu complet côté serveur uniquement';

create table if not exists public.demo_rate_limit (
  ip_hash text not null,
  window_type text not null check (window_type in ('day', 'week')),
  window_start date not null,
  hit_count int not null default 1,
  primary key (ip_hash, window_type, window_start)
);

create index if not exists demo_rate_limit_window_idx on public.demo_rate_limit (window_start);

create table if not exists public.demo_monthly_usage (
  month_key text primary key,
  hit_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- Analytics : events tunnel démo vocale
alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events add constraint analytics_events_event_type_check check (
  event_type in (
    'page_view', 'page_exit', 'landing_view', 'cta_click',
    'video_play', 'video_25', 'video_50', 'video_75', 'video_complete',
    'pricing_view', 'register_view', 'register_submit', 'register_error', 'register_success',
    'register_field_focus', 'register_field_blur_empty', 'cgu_checkbox_checked',
    'google_oauth_click', 'google_oauth_error', 'google_oauth_success',
    'inapp_browser_detected', 'onboarding_profile_complete', 'first_devis_created', 'first_devis_sent',
    'trial_expired', 'subscription_started', 'human_engagement', 'field_focus', 'field_blur',
    'demo_start', 'demo_mic_permission_granted', 'demo_mic_permission_denied',
    'demo_recording_complete', 'demo_generation_success', 'demo_generation_error',
    'demo_preview_shown', 'demo_cta_signup_click', 'demo_rate_limited', 'demo_text_fallback_used'
  )
);
