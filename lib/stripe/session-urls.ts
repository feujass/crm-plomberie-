import { createClient } from "@/lib/supabase/server";
import {
  isFlowoBilling,
  isFlowoPlanId,
  resolveStripePriceId,
  type FlowoBilling,
  type FlowoPlanId,
} from "@/lib/stripe/plans";
import Stripe from "stripe";

export type CheckoutSessionOptions = {
  planId?: FlowoPlanId;
  billing?: FlowoBilling;
};

/**
 * URLs de session Stripe utilisées par les Route Handlers (`/api/stripe/*`), pas via Server Actions.
 */
export async function getCheckoutSessionUrl(options: CheckoutSessionOptions = {}): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Non authentifié");

  const planId = options.planId ?? "pro";
  const billing = options.billing ?? "monthly";
  const priceId = resolveStripePriceId(planId, billing);

  const stripe = new Stripe(stripeKey);
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { data: profile } = await supabase.from("profiles").select("referred_by_partner_id").eq("id", user.id).single();

  const metadata: Record<string, string> = {
    supabase_user_id: user.id,
    flowo_plan: planId,
    flowo_billing: billing,
  };
  if (profile?.referred_by_partner_id) {
    metadata.referred_by_partner_id = String(profile.referred_by_partner_id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/compte/donnees?stripe=success`,
    cancel_url: `${base}/compte/donnees?stripe=cancel`,
    metadata,
    subscription_data: {
      metadata,
    },
  });

  if (!session.url) throw new Error("URL Stripe vide");
  return session.url;
}

export function parseCheckoutBody(body: unknown): CheckoutSessionOptions {
  if (!body || typeof body !== "object") return {};
  const { planId, billing } = body as { planId?: string; billing?: string };
  const options: CheckoutSessionOptions = {};
  if (planId && isFlowoPlanId(planId)) options.planId = planId;
  if (billing && isFlowoBilling(billing)) options.billing = billing;
  return options;
}

export async function getBillingPortalSessionUrl(): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) throw new Error("Aucun client Stripe lié");

  const stripe = new Stripe(stripeKey);
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${base}/compte/donnees`,
  });
  if (!session.url) throw new Error("URL portail vide");
  return session.url;
}
