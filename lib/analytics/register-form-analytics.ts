"use client";

import { getOrCreateSessionId } from "@/lib/analytics/session";
import { sendAnalyticsEvent } from "@/lib/analytics/track-client";

export function registerFieldAnalyticsHandlers(field: string, getValue: () => string) {
  return {
    onFocus: () => {
      void sendAnalyticsEvent({
        session_id: getOrCreateSessionId(),
        event_type: "register_field_focus",
        page_path: window.location.pathname,
        properties: { field },
      });
    },
    onBlur: () => {
      if (getValue().trim().length > 0) return;
      void sendAnalyticsEvent({
        session_id: getOrCreateSessionId(),
        event_type: "register_field_blur_empty",
        page_path: window.location.pathname,
        properties: { field },
      });
    },
  };
}

export function trackCguCheckboxChecked(): void {
  void sendAnalyticsEvent({
    session_id: getOrCreateSessionId(),
    event_type: "cgu_checkbox_checked",
    page_path: window.location.pathname,
  });
}
