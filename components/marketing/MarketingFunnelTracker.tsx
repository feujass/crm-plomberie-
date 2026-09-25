"use client";

import { useEffect } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";

function isRegisterHref(href: string | null): boolean {
  if (!href) return false;
  try {
    const path = href.startsWith("http") ? new URL(href).pathname : href.split("?")[0];
    return path === "/register";
  } catch {
    return href.startsWith("/register");
  }
}

/** CTA clicks (hero, header, tarifs, sticky, inscription) + visibilité des tarifs. */
export function MarketingFunnelTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const marked = target.closest("[data-cta-location]") as HTMLElement | null;
      const registerLink = target.closest("a[href]") as HTMLAnchorElement | null;
      const el =
        marked ?? (registerLink && isRegisterHref(registerLink.getAttribute("href")) ? registerLink : null);
      if (!el) return;
      const location = el.getAttribute("data-cta-location") ?? "unknown";
      trackFunnelEvent("cta_click", { properties: { location } });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
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
