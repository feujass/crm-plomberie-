"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";

// #region agent log
const _agentIngest = (payload: Record<string, unknown>) =>
  fetch("http://127.0.0.1:7491/ingest/2e2dbe90-bece-4fb6-a37a-f62acd64652c", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0f238e" },
    body: JSON.stringify({ sessionId: "0f238e", timestamp: Date.now(), ...payload }),
  }).catch(() => {});
// #endregion

async function stripePostJson(kind: "checkout" | "billing-portal") {
  const res = await fetch(`/api/stripe/${kind === "checkout" ? "checkout" : "billing-portal"}`, {
    method: "POST",
  });
  const ct = res.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  try {
    body = ct.includes("json") ? ((await res.json()) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }
  _agentIngest({
    hypothesisId: "stripe-api",
    location: "StripeButtons.tsx",
    message: kind,
    data: { ok: res.ok, status: res.status, ct, hasUrl: typeof body.url === "string" },
  });
  if (!res.ok) {
    const message = typeof body.message === "string" ? body.message : `Stripe ${res.status}`;
    throw new Error(message);
  }
  const url = typeof body.url === "string" ? body.url : "";
  if (!url) throw new Error("Réponse Stripe sans URL");
  return url;
}

export function StripeButtons({ hasStripeCustomer }: { hasStripeCustomer: boolean }) {
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button
        type="button"
        onClick={async () => {
          setErr(null);
          try {
            const url = await stripePostJson("checkout");
            window.location.href = url;
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Stripe indisponible");
          }
        }}
      >
        Passer Pro (Stripe Checkout)
      </Button>
      {hasStripeCustomer ? (
        <Button
          type="button"
          variant="secondary"
          className="ml-2"
          onClick={async () => {
            setErr(null);
            try {
              const url = await stripePostJson("billing-portal");
              window.location.href = url;
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Portail indisponible");
            }
          }}
        >
          Portail facturation
        </Button>
      ) : null}
    </div>
  );
}
