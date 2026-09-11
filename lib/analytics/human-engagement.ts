"use client";

import { getOrCreateSessionId } from "@/lib/analytics/session";
import { sendAnalyticsEventBeacon } from "@/lib/analytics/track-client";

const MIN_DWELL_MS = 3000;

/** Envoie human_engagement au 1er scroll, clic, ou après 3 s sur la page. */
export function installHumanEngagementTracker(pagePath: string): () => void {
  if (typeof window === "undefined") return () => undefined;

  let sent = false;

  const fire = (signal: "scroll" | "click" | "dwell") => {
    if (sent) return;
    sent = true;
    sendAnalyticsEventBeacon({
      session_id: getOrCreateSessionId(),
      event_type: "human_engagement",
      page_path: pagePath,
      properties: { signal },
    });
    cleanup();
  };

  const onScroll = () => fire("scroll");
  const onClick = () => fire("click");
  const timer = window.setTimeout(() => fire("dwell"), MIN_DWELL_MS);

  window.addEventListener("scroll", onScroll, { passive: true, once: true });
  window.addEventListener("click", onClick, { once: true });

  function cleanup() {
    window.clearTimeout(timer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("click", onClick);
  }

  return cleanup;
}
