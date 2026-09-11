import { createAdminClient } from "@/lib/supabase/admin";
import { recordCommissionFromInvoice } from "@/lib/affiliate/server";
import {
  parseFlowoPlanId,
  resolvePlanFromStripePriceId,
  type FlowoPlanId,
} from "@/lib/stripe/plans";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function planFromCheckoutSession(session: Stripe.Checkout.Session): FlowoPlanId {
  return parseFlowoPlanId(session.metadata?.flowo_plan) ?? "pro";
}

function planFromSubscription(sub: Stripe.Subscription): FlowoPlanId {
  const fromMeta = parseFlowoPlanId(sub.metadata?.flowo_plan);
  if (fromMeta) return fromMeta;
  const priceId = sub.items.data[0]?.price?.id;
  return resolvePlanFromStripePriceId(priceId) ?? "pro";
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

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
    const customer = customerIdFrom(session.customer);
    if (userId && customer) {
      const plan = planFromCheckoutSession(session);
      await admin
        .from("profiles")
        .update({ subscription_plan: plan, subscription_status: "active", stripe_customer_id: customer })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = customerIdFrom(sub.customer);
    if (customerId) {
      if (sub.status === "active" || sub.status === "trialing") {
        const plan = planFromSubscription(sub);
        await admin
          .from("profiles")
          .update({ subscription_plan: plan, subscription_status: "active", stripe_customer_id: customerId })
          .eq("stripe_customer_id", customerId);
      } else if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
        await admin
          .from("profiles")
          .update({ subscription_plan: "free", subscription_status: sub.status })
          .eq("stripe_customer_id", customerId);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = customerIdFrom(sub.customer);
    if (customerId) {
      await admin
        .from("profiles")
        .update({ subscription_plan: "free", subscription_status: "canceled" })
        .eq("stripe_customer_id", customerId);
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = customerIdFrom(invoice.customer);
    if (customerId && invoice.amount_paid > 0) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, referred_by_partner_id, subscription_plan")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      const partnerId = profile?.referred_by_partner_id;
      const userId = profile?.id;

      if (partnerId && userId) {
        const { data: partner } = await admin
          .from("affiliate_partners")
          .select("id, commission_rate_percent, status")
          .eq("id", partnerId)
          .eq("status", "active")
          .maybeSingle();

        if (partner) {
          const grossEur = invoice.amount_paid / 100;
          await recordCommissionFromInvoice({
            partnerId: String(partner.id),
            referredUserId: String(userId),
            stripeInvoiceId: invoice.id,
            grossAmountEur: grossEur,
            commissionRatePercent: Number(partner.commission_rate_percent ?? 20),
            periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
          });

          if (profile.subscription_plan) {
            await admin
              .from("affiliate_referrals")
              .update({
                status: "subscribed",
                subscribed_plan: String(profile.subscription_plan),
                converted_at: new Date().toISOString(),
              })
              .eq("partner_id", partnerId)
              .eq("referred_user_id", userId);
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
