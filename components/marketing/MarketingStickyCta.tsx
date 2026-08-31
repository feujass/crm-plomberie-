"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { hasCookieConsentChoice } from "@/lib/cookies/consent";
import { cx, focusRing } from "@/lib/utils";

export function MarketingStickyCta() {
  const [visible, setVisible] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(false);

  useEffect(() => {
    setCookieVisible(!hasCookieConsentChoice());

    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onConsent = () => setCookieVisible(false);
    window.addEventListener("flowo:cookie-consent-changed", onConsent);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("flowo:cookie-consent-changed", onConsent);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cx(
        "fixed inset-x-0 z-[90] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-[bottom] duration-300 dark:border-slate-800 dark:bg-slate-950/95 md:hidden",
        cookieVisible ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <Link
        href="/register"
        data-cta-location="sticky_mobile"
        className={cx(
          focusRing,
          "flex min-h-11 w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 text-sm font-semibold text-white",
        )}
      >
        Essayer gratuitement — sans CB
      </Link>
    </div>
  );
}
