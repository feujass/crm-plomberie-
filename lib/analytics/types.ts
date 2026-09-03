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
  | "onboarding_profile_complete"
  | "first_devis_created"
  | "first_devis_sent"
  | "trial_expired"
  | "subscription_started"
  | "human_engagement"
  | "field_focus"
  | "field_blur";

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
};
