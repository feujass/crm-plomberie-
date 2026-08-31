"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { initSessionAttribution, trackFunnelEvent } from "@/lib/analytics/funnel";
import { getOrCreateSessionId } from "@/lib/analytics/session";
import { hasSentAttribution, markAttributionSent } from "@/lib/analytics/session-attribution";
import { sendAnalyticsEvent } from "@/lib/analytics/track-client";

/** Parcours anonyme exempté (1ʳᵉ partie) + attribution session au 1er hit. */
export function useAnalytics(): void {
  const pathname = usePathname();
  const pageEnteredAt = useRef<number>(Date.now());
  const currentPath = useRef<string>("");
  const attributionReady = useRef(false);

  useEffect(() => {
    if (!attributionReady.current) {
      initSessionAttribution();
      attributionReady.current = true;
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;

    const sessionId = getOrCreateSessionId();
    const previousPath = currentPath.current;

    if (previousPath && previousPath !== pathname) {
      sendAnalyticsEvent({
        session_id: sessionId,
        event_type: "page_exit",
        page_path: previousPath,
        time_on_page_ms: Date.now() - pageEnteredAt.current,
      });
    }

    currentPath.current = pathname;
    pageEnteredAt.current = Date.now();

    sendAnalyticsEvent({
      session_id: sessionId,
      event_type: "page_view",
      page_path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      attach_session: !hasSentAttribution(),
    });
    if (!hasSentAttribution()) markAttributionSent();

    if (pathname === "/") {
      trackFunnelEvent("landing_view", { page_path: pathname });
    }
    if (pathname === "/register") {
      trackFunnelEvent("register_view", { page_path: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const path = currentPath.current;
      if (!path) return;
      sendAnalyticsEvent({
        session_id: getOrCreateSessionId(),
        event_type: "page_exit",
        page_path: path,
        time_on_page_ms: Date.now() - pageEnteredAt.current,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
