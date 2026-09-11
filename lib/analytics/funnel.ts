"use client";

import { getOrCreateSessionId } from "@/lib/analytics/session";
import {
  captureSessionAttributionFromLocation,
  hasSentAttribution,
  markAttributionSent,
} from "@/lib/analytics/session-attribution";
import { sendAnalyticsEvent } from "@/lib/analytics/track-client";
import type { AnalyticsEventType } from "@/lib/analytics/types";

export function trackFunnelEvent(
  event_type: AnalyticsEventType,
  opts?: { page_path?: string; properties?: Record<string, unknown> },
): void {
  if (typeof window === "undefined") return;
  const session_id = getOrCreateSessionId();
  const page_path = opts?.page_path ?? window.location.pathname;
  const attach_session = !hasSentAttribution();

  void (async () => {
    const ok = await sendAnalyticsEvent({
      session_id,
      event_type,
      page_path,
      referrer: document.referrer || null,
      properties: opts?.properties ?? null,
      attach_session,
    });
    if (ok && attach_session) markAttributionSent();
  })();
}

export function initSessionAttribution(): void {
  if (typeof window === "undefined") return;
  captureSessionAttributionFromLocation(window.location.search, window.location.pathname);
}
