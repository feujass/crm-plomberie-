import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

/**
 * URLs de session Stripe utilisées par les Route Handlers (`/api/stripe/*`), pas via Server Actions.
 */
export async function getCheckoutSessionUrl(): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Non authentifié");

  const stripe = new Stripe(stripeKey);
  const priceId = process.env.STRIPE_PRICE_PRO;
  if (!priceId) throw new Error("STRIPE_PRICE_PRO manquant");

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/compte/donnees?stripe=success`,
    cancel_url: `${base}/compte/donnees?stripe=cancel`,
    metadata: { supabase_user_id: user.id },
  });

  if (!session.url) throw new Error("URL Stripe vide");
  return session.url;
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
