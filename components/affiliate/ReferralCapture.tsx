"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { AFFILIATE_REF_COOKIE, AFFILIATE_REF_MAX_AGE_DAYS, normalizeReferralCode } from "@/lib/affiliate/constants";

/** Capture ?ref=CODE sur la landing et enregistre le clic. */
export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    const code = normalizeReferralCode(ref);
    if (!code) return;

    const maxAge = AFFILIATE_REF_MAX_AGE_DAYS * 24 * 60 * 60;
    const secure = window.location.protocol === "https:";
    document.cookie = `${AFFILIATE_REF_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;

    void fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        landing_path: window.location.pathname,
        utm_source: searchParams.get("utm_source"),
        utm_medium: searchParams.get("utm_medium"),
        utm_campaign: searchParams.get("utm_campaign"),
      }),
    });
  }, [searchParams]);

  return null;
}
