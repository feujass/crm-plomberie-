"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { syncInternalAnalyticsSession } from "@/lib/analytics/internal-cookie";

/** Capture google_oauth_success depuis ?google_oauth=success (callback OAuth). */
export function OAuthAnalyticsCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const oauth = searchParams.get("google_oauth");
    if (oauth !== "success") return;
    handled.current = true;

    trackFunnelEvent("google_oauth_success", { properties: { method: "google" } });
    trackFunnelEvent("register_success", { properties: { method: "google" } });
    void syncInternalAnalyticsSession();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("google_oauth");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  return null;
}

/** Capture google_oauth_error depuis ?auth_error=callback sur /login. */
export function OAuthErrorAnalyticsCapture({
  authError,
  errorCode,
  errorMessage,
}: {
  authError: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const handled = useRef(false);

  useEffect(() => {
    if (!authError || handled.current) return;
    handled.current = true;
    trackFunnelEvent("google_oauth_error", {
      properties: {
        error_code: errorCode?.trim() || "callback",
        error_message: errorMessage?.trim() || "Échec de la connexion Google",
      },
    });
  }, [authError, errorCode, errorMessage]);

  return null;
}
