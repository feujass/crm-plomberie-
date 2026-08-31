"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { applyAnalyticsConsent, trackPageView } from "@/lib/analytics/posthog";
import { CONSENT_CHANGED_EVENT, readCookieConsent } from "@/lib/cookies/consent";

/** Suivi des pages et application du consentement cookies (PostHog). */
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const consent = readCookieConsent();
    if (consent) void applyAnalyticsConsent(consent.analytics);

    const onConsent = (e: Event) => {
      const analytics = (e as CustomEvent<{ analytics: boolean }>).detail?.analytics;
      if (typeof analytics === "boolean") void applyAnalyticsConsent(analytics);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const consent = readCookieConsent();
    if (!consent?.analytics) return;
    void trackPageView(pathname);
  }, [pathname]);

  return null;
}
