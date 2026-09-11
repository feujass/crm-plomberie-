-- human_engagement : scroll / clic / ≥ 3 s (filtre anti-robots dashboard)

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
