"use client";

import { createBillingPortalSession, createCheckoutSession } from "@/app/actions/stripe";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

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
            const url = await createCheckoutSession();
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
              const url = await createBillingPortalSession();
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
