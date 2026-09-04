export type AnalyticsEventType =
  | "page_view"
  | "page_exit"
  | "landing_view"
  | "cta_click"
  | "video_play"
  | "video_25"
  | "video_50"
  | "video_75"
  | "video_complete"
  | "pricing_view"
  | "register_view"
  | "register_submit"
  | "register_error"
  | "register_success"
  | "register_field_focus"
  | "register_field_blur_empty"
  | "cgu_checkbox_checked"
  | "google_oauth_click"
  | "google_oauth_error"
  | "google_oauth_success"
  | "inapp_browser_detected"
  | "onboarding_profile_complete"
  | "first_devis_created"
  | "first_devis_sent"
  | "trial_expired"
  | "subscription_started"
  | "human_engagement"
  | "field_focus"
  | "field_blur"
  | "demo_start"
  | "demo_mic_permission_granted"
  | "demo_mic_permission_denied"
  | "demo_recording_complete"
  | "demo_generation_success"
  | "demo_generation_error"
  | "demo_preview_shown"
  | "demo_cta_signup_click"
  | "demo_rate_limited"
  | "demo_text_fallback_used";

export type SessionAttributionPayload = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
  referrer_domain?: string | null;
  landing_path?: string | null;
  viewport_width?: number | null;
};

export type AnalyticsEventPayload = {
  session_id: string;
  event_type: AnalyticsEventType;
  page_path: string;
  referrer?: string | null;
  time_on_page_ms?: number | null;
  properties?: Record<string, unknown> | null;
  attribution?: SessionAttributionPayload | null;
  attach_session?: boolean;
  /** Marque le trafic interne (équipe) — lu par /api/track en plus du cookie flowo_internal. */
  is_internal?: boolean;
};
