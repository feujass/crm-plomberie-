-- Event analytics : clic hero vers la démo vocale
alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events add constraint analytics_events_event_type_check check (
  event_type in (
    'page_view', 'page_exit', 'landing_view', 'cta_click', 'cta_to_demo_click',
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
