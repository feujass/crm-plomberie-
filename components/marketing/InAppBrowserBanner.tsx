"use client";

import Image from "next/image";
import { useState } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { useInAppBrowser } from "@/lib/use-in-app-browser";
import { cx, focusRing } from "@/lib/utils";

const SITE_URL = "https://flowo.agency";
const ANDROID_CHROME_INTENT =
  "intent://flowo.agency#Intent;scheme=https;package=com.android.chrome;end";

export function InAppBrowserBanner() {
  const { isInApp, appName, os, ready } = useInAppBrowser();
  const [copied, setCopied] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  if (!ready || !isInApp) return null;

  const appLabel = appName ?? "cette app";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      trackFunnelEvent("inapp_copy_link_click", { properties: { app: appName, os } });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papier indisponible */
    }
  }

  function onOpenExternalClick() {
    trackFunnelEvent("inapp_open_external_click", { properties: { app: appName, os } });
    if (os === "ios") setIosHelpOpen((open) => !open);
  }

  return (
    <div className="px-4 pt-3 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-blue-200 bg-[#EFF6FF] px-4 py-3.5 text-left shadow-sm dark:border-blue-900/40 dark:bg-blue-950/40 lg:max-w-7xl sm:px-5">
        <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
          La dictée vocale ne marche pas dans le navigateur {appLabel}
        </p>
        <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">
          Ouvre la page dans ton navigateur pour essayer la voix, ou écris ton chantier juste en dessous.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {os === "android" ? (
            <a
              href={ANDROID_CHROME_INTENT}
              onClick={onOpenExternalClick}
              className={cx(
                focusRing,
                "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm sm:w-auto",
              )}
            >
              Ouvrir dans Chrome
            </a>
          ) : null}

          {os === "ios" ? (
            <button
              type="button"
              onClick={onOpenExternalClick}
              aria-expanded={iosHelpOpen}
              className={cx(
                focusRing,
                "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm sm:w-auto",
              )}
            >
              Comment faire ?
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void copyLink()}
            className={cx(
              focusRing,
              "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-[#2563EB] sm:w-auto dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
            )}
          >
            {copied ? "Lien copié ✓" : "Copier le lien"}
          </button>
        </div>

        {os === "ios" && iosHelpOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm text-slate-700 dark:border-blue-900/50 dark:bg-slate-950 dark:text-slate-200">
            <ol className="list-decimal space-y-1.5 pl-5 leading-snug">
              <li>Appuie sur les ••• en haut à droite</li>
              <li>Choisis « Ouvrir dans le navigateur » (ou « Ouvrir dans Safari »)</li>
            </ol>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <Image
                src="/marketing/inapp-ios-open-safari.svg"
                alt="Menu de l’app : ouvrir la page dans Safari"
                width={720}
                height={420}
                className="h-auto w-full"
                unoptimized
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
