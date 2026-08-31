import type { AnalyticsEventPayload } from "@/lib/analytics/types";
import { readSessionAttribution } from "@/lib/analytics/session-attribution";

const TRACK_ENDPOINT = "/api/track";

export function sendAnalyticsEvent(payload: AnalyticsEventPayload): void {
  const bodyPayload: AnalyticsEventPayload = { ...payload };
  if (payload.attach_session) {
    bodyPayload.attribution = readSessionAttribution();
  }

  const body = JSON.stringify(bodyPayload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) return;
  }

  void fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
