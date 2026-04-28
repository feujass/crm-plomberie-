import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ message: "Stripe non configuré" }, { status: 500 });

  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret);
  } catch {
    return NextResponse.json({ message: "Signature invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (userId && customer) {
      await admin
        .from("profiles")
        .update({ subscription_plan: "pro", subscription_status: "active", stripe_customer_id: customer })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (customerId) {
      await admin
        .from("profiles")
        .update({ subscription_plan: "free", subscription_status: "canceled" })
        .eq("stripe_customer_id", customerId);
    }
  }

  return NextResponse.json({ received: true });
}
