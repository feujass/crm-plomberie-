-- LOT 1 : is_internal NOT NULL + index dashboard + nouveaux event_type funnel

alter table public.analytics_events
  alter column is_internal set default false;

update public.analytics_events
  set is_internal = false
  where is_internal is null;

alter table public.analytics_events
  alter column is_internal set not null;

create index if not exists analytics_events_internal_created_idx
  on public.analytics_events (is_internal, created_at desc);

alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;

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
      'register_field_focus',
      'register_field_blur_empty',
      'cgu_checkbox_checked',
      'google_oauth_click',
      'google_oauth_error',
      'google_oauth_success',
      'inapp_browser_detected',
      'field_focus',
      'field_blur',
      'onboarding_profile_complete',
      'first_devis_created',
      'first_devis_sent',
      'trial_expired',
      'subscription_started',
      'human_engagement'
    )
  );
