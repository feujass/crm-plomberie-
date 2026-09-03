import type { AnalyticsEventPayload } from "@/lib/analytics/types";
import {
  eventTypesWithAttribution,
  readSessionAttribution,
} from "@/lib/analytics/session-attribution";

const TRACK_ENDPOINT = "/api/track";

/** Construit le corps POST avec attribution jointe à l'événement (lisible par le dashboard). */
export function buildAnalyticsRequestBody(payload: AnalyticsEventPayload): AnalyticsEventPayload {
  const bodyPayload: AnalyticsEventPayload = { ...payload };

  if (eventTypesWithAttribution().has(payload.event_type)) {
    bodyPayload.attribution = readSessionAttribution();
  }

  return bodyPayload;
}

/**
 * Envoie un event analytics.
 * Retourne true uniquement si le serveur répond 200 (requis avant markAttributionSent).
 */
export async function sendAnalyticsEvent(payload: AnalyticsEventPayload): Promise<boolean> {
  const bodyPayload = buildAnalyticsRequestBody(payload);
  const body = JSON.stringify(bodyPayload);
  const needsAck = payload.attach_session === true || payload.event_type === "page_view";

  if (!needsAck && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) return true;
  }

  try {
    const res = await fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Alias synchrone pour page_exit / beforeunload (pas de confirmation 200). */
export function sendAnalyticsEventBeacon(payload: AnalyticsEventPayload): void {
  const body = JSON.stringify(buildAnalyticsRequestBody(payload));
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
