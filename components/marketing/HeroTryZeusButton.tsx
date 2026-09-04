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
        "inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--primary)] px-8 text-base font-semibold text-white shadow-md hover:opacity-95",
      )}
    >
      Essayer Zeus gratuitement
    </button>
  );
}
