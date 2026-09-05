"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { syncInternalAnalyticsSession } from "@/lib/analytics/internal-cookie";
import { installHumanEngagementTracker } from "@/lib/analytics/human-engagement";
import { initSessionAttribution, trackFunnelEvent } from "@/lib/analytics/funnel";
import { getOrCreateSessionId } from "@/lib/analytics/session";
import {
  hasSentAttribution,
  markAttributionSent,
  refreshSessionAttributionViewport,
} from "@/lib/analytics/session-attribution";
import { sendAnalyticsEvent, sendAnalyticsEventBeacon } from "@/lib/analytics/track-client";

/** Parcours anonyme exempté (1ʳᵉ partie) + attribution session au 1er hit confirmé. */
export function useAnalytics(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageEnteredAt = useRef<number>(Date.now());
  const currentPath = useRef<string>("");

  useEffect(() => {
    initSessionAttribution();
    refreshSessionAttributionViewport();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pathname) return;

    const sessionId = getOrCreateSessionId();
    const previousPath = currentPath.current;

    if (previousPath && previousPath !== pathname) {
      sendAnalyticsEventBeacon({
        session_id: sessionId,
        event_type: "page_exit",
        page_path: previousPath,
        time_on_page_ms: Date.now() - pageEnteredAt.current,
      });
    }

    currentPath.current = pathname;
    pageEnteredAt.current = Date.now();

    void (async () => {
      await syncInternalAnalyticsSession();

      const attach_session = !hasSentAttribution();
      const ok = await sendAnalyticsEvent({
        session_id: sessionId,
        event_type: "page_view",
        page_path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        attach_session,
      });
      if (ok && attach_session) markAttributionSent();

      if (pathname === "/") {
        trackFunnelEvent("landing_view", { page_path: pathname });
      }
      if (pathname === "/register") {
        trackFunnelEvent("register_view", { page_path: pathname });
      }
    })();

    const cleanupEngagement = installHumanEngagementTracker(pathname);
    return cleanupEngagement;
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const path = currentPath.current;
      if (!path) return;
      sendAnalyticsEventBeacon({
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
