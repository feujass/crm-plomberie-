"use client";

import { getOrCreateSessionId } from "@/lib/analytics/session";
import { sendAnalyticsEvent } from "@/lib/analytics/track-client";

export function formFieldAnalyticsHandlers(field: string, getValue: () => string) {
  return {
    onFocus: () => {
      void sendAnalyticsEvent({
        session_id: getOrCreateSessionId(),
        event_type: "field_focus",
        page_path: window.location.pathname,
        properties: { field },
      });
    },
    onBlur: () => {
      void sendAnalyticsEvent({
        session_id: getOrCreateSessionId(),
        event_type: "field_blur",
        page_path: window.location.pathname,
        properties: { field, value_filled: getValue().trim().length > 0 },
      });
    },
  };
}
