"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function StripeBillingPortalButton() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-2">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={async () => {
          setErr(null);
          setLoading(true);
          try {
            const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
            const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
            if (!res.ok) throw new Error(body.message ?? `Stripe ${res.status}`);
            if (!body.url) throw new Error("Réponse Stripe sans URL");
            window.location.href = body.url;
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Portail indisponible");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Ouverture…" : "Gérer mon abonnement (Stripe)"}
      </Button>
    </div>
  );
}
