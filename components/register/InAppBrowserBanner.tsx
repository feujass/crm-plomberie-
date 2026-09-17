"use client";

import { useEffect, useState } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";

/** Bannière webview in-app — invite à ouvrir dans Safari/Chrome. */
export function InAppBrowserBanner() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback silencieux */
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-medium">Pour une meilleure expérience, ouvre cette page dans Safari ou Chrome.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void copyUrl()}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-50 dark:hover:bg-amber-900/50"
        >
          {copied ? "URL copiée" : "Copier l'URL"}
        </button>
      </div>
    </div>
  );
}

/** Détecte la webview in-app et envoie inapp_browser_detected. */
export function useInAppBrowserDetection(): boolean {
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    void import("@/lib/analytics/in-app-browser").then(({ isInAppBrowser }) => {
      const result = isInAppBrowser();
      if (result.isInApp) {
        setInApp(true);
        trackFunnelEvent("inapp_browser_detected", { properties: { app: result.app } });
      }
    });
  }, []);

  return inApp;
}
