"use client";

import { useEffect, useRef } from "react";

export function StripeCheckoutAutoRedirect({
  plan,
  billing,
  autoCheckout,
}: {
  plan?: string;
  billing?: string;
  autoCheckout?: boolean;
}) {
  const started = useRef(false);

  useEffect(() => {
    if (!autoCheckout || started.current || !plan || !billing) return;
    started.current = true;
    void fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan, billing }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { url?: string };
        if (body.url) window.location.href = body.url;
      })
      .catch(() => {});
  }, [autoCheckout, plan, billing]);

  return null;
}
