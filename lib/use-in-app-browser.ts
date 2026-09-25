"use client";

import { useEffect, useState } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";
import {
  detectInAppBrowser,
  type InAppOs,
} from "@/lib/analytics/in-app-browser";

export type UseInAppBrowserState = {
  isInApp: boolean;
  appName: string | null;
  os: InAppOs;
  /** false tant que la détection client n'a pas tourné (évite flash + mismatch SSR). */
  ready: boolean;
};

const UNKNOWN: UseInAppBrowserState = {
  isInApp: false,
  appName: null,
  os: "other",
  ready: false,
};

const TRACKED_KEY = "flowo_inapp_detected";

function markDetectedOnce(): boolean {
  try {
    if (sessionStorage.getItem(TRACKED_KEY) === "1") return false;
    sessionStorage.setItem(TRACKED_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

/** Détection client-only des navigateurs in-app (TikTok, Instagram, …). */
export function useInAppBrowser(): UseInAppBrowserState {
  const [state, setState] = useState<UseInAppBrowserState>(UNKNOWN);

  useEffect(() => {
    const detected = detectInAppBrowser();
    setState({
      isInApp: detected.isInApp,
      appName: detected.appName,
      os: detected.os,
      ready: true,
    });

    if (detected.isInApp && markDetectedOnce()) {
      trackFunnelEvent("inapp_browser_detected", {
        properties: { app: detected.appName, os: detected.os },
      });
    }
  }, []);

  return state;
}
