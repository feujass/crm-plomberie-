"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { applyAnalyticsConsent } from "@/lib/analytics/posthog";
import { loadMetaPixel } from "@/lib/analytics/meta-pixel";
import {
  CONSENT_CHANGED_EVENT,
  hasCookieConsentChoice,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentState,
} from "@/lib/cookies/consent";
import { cx, focusRing } from "@/lib/utils";

type View = "banner" | "customize";

const SHOW_DELAY_MS = 1500;

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<View>("banner");
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = readCookieConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      void applyAnalyticsConsent(existing.analytics);
      if (existing.analytics) loadMetaPixel();
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setEntered(true));
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsentState>).detail;
      if (detail) {
        setAnalytics(detail.analytics);
        setVisible(false);
      }
    };
    const onOpenSettings = () => {
      const existing = readCookieConsent();
      setAnalytics(existing?.analytics ?? false);
      setView("customize");
      setVisible(true);
      setEntered(true);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged);
    window.addEventListener("flowo:open-cookie-settings", onOpenSettings);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged);
      window.removeEventListener("flowo:open-cookie-settings", onOpenSettings);
    };
  }, []);

  const persist = useCallback(async (allowAnalytics: boolean) => {
    writeCookieConsent(allowAnalytics);
    await applyAnalyticsConsent(allowAnalytics);
    if (allowAnalytics) loadMetaPixel();
    setVisible(false);
    setView("banner");
  }, []);

  if (!mounted) return null;
  if (!visible && hasCookieConsentChoice()) return null;
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className={cx(
        "fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md transition-transform duration-500 ease-out dark:border-slate-700 dark:bg-slate-950/95",
        entered ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-h-[120px] max-w-7xl flex-col gap-3 px-4 py-3 sm:max-h-[72px] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-2.5 lg:px-8">
        {view === "banner" ? (
          <>
            <p id="cookie-consent-desc" className="text-sm leading-snug text-slate-600 dark:text-slate-400">
              <span id="cookie-consent-title" className="sr-only">
                Cookies
              </span>
              On mesure l&apos;usage du site pour l&apos;améliorer.{" "}
              <Link href="/legal/cookies" className="font-medium text-[color:var(--primary)] hover:underline">
                Politique cookies
              </Link>
              {" · "}
              <Link href="/legal/confidentialite" className="font-medium text-[color:var(--primary)] hover:underline">
                Confidentialité
              </Link>
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => void persist(true)}
                className={cx(
                  "rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95",
                  focusRing,
                )}
              >
                Accepter
              </button>
              <button
                type="button"
                onClick={() => void persist(false)}
                className={cx("text-sm font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-400", focusRing)}
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={() => setView("customize")}
                className={cx("text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200", focusRing)}
              >
                Personnaliser
              </button>
            </div>
          </>
        ) : (
          <div className="w-full py-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Préférences cookies</p>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5" />
              <span>Analytique PostHog (pages, parcours)</span>
            </label>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => void persist(analytics)}
                className={cx("rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white", focusRing)}
              >
                Enregistrer
              </button>
              <button type="button" onClick={() => setView("banner")} className="text-sm text-slate-600">
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("flowo:open-cookie-settings"));
}
