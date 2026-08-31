"use client";

import { useEffect } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";

/** CTA clicks + pricing section visibility. */
export function MarketingFunnelTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a[href='/register'], a[href^='/register?']") as HTMLElement | null;
      if (!link) return;
      const location = link.getAttribute("data-cta-location") ?? "unknown";
      trackFunnelEvent("cta_click", { properties: { location } });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const section = document.getElementById("tarifs");
    if (!section || typeof IntersectionObserver === "undefined") return;

    let visibleSince: number | null = null;
    let sent = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.intersectionRatio >= 0.5) {
          if (visibleSince == null) visibleSince = Date.now();
          if (!sent && visibleSince && Date.now() - visibleSince >= 1000) {
            sent = true;
            trackFunnelEvent("pricing_view");
          }
        } else {
          visibleSince = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return null;
}
