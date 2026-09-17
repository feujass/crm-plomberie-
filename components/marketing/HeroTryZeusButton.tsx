"use client";

import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { cx, focusRing } from "@/lib/utils";

function scrollToDemoAndFocusMic() {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    document.getElementById("hero-demo-mic")?.focus({ preventScroll: true });
  }, 450);
}

export function HeroTryZeusButton() {
  return (
    <button
      type="button"
      data-cta-location="hero"
      onClick={() => {
        trackFunnelEvent("cta_to_demo_click", { properties: { location: "hero" } });
        scrollToDemoAndFocusMic();
      }}
      className={cx(
        focusRing,
        "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold sm:w-auto sm:px-8 sm:text-base",
        "border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/60",
        "sm:border-0 sm:bg-[color:var(--primary)] sm:text-white sm:shadow-md sm:hover:opacity-95 dark:sm:hover:bg-[color:var(--primary)]",
      )}
    >
      Essayer Zeus gratuitement
    </button>
  );
}
