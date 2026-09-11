import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

export function isStripeConnectConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export async function getPartnerConnectStatus(partnerId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliate_partners")
    .select("stripe_connect_account_id, stripe_connect_onboarded")
    .eq("id", partnerId)
    .maybeSingle();

  return {
    accountId: (data?.stripe_connect_account_id as string | null) ?? null,
    onboarded: Boolean(data?.stripe_connect_onboarded),
  };
}

export async function createStripeConnectOnboardingLink(params: {
  partnerId: string;
  userId: string;
  email: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: false, error: "STRIPE_SECRET_KEY manquant." };

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("affiliate_partners")
    .select("id, stripe_connect_account_id, brand_name")
    .eq("id", params.partnerId)
    .eq("user_id", params.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!partner) return { ok: false, error: "Partenaire introuvable." };

  const stripe = new Stripe(key);
  let accountId = partner.stripe_connect_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: params.email,
      business_profile: {
        name: String(partner.brand_name ?? "Partenaire Flowo"),
      },
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        affiliate_partner_id: params.partnerId,
        flowo_user_id: params.userId,
      },
    });
    accountId = account.id;
    await admin
      .from("affiliate_partners")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", params.partnerId);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/partenaire/commissions?connect=refresh`,
    return_url: `${base}/partenaire/commissions?connect=success`,
    type: "account_onboarding",
  });

  if (!link.url) return { ok: false, error: "URL Stripe Connect vide." };
  return { ok: true, url: link.url };
}

export async function refreshStripeConnectOnboarded(partnerId: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return false;

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("affiliate_partners")
    .select("stripe_connect_account_id")
    .eq("id", partnerId)
    .maybeSingle();

  const accountId = partner?.stripe_connect_account_id as string | null;
  if (!accountId) return false;

  const stripe = new Stripe(key);
  const account = await stripe.accounts.retrieve(accountId);
  const onboarded = Boolean(account.charges_enabled && account.payouts_enabled);

  await admin
    .from("affiliate_partners")
    .update({ stripe_connect_onboarded: onboarded })
    .eq("id", partnerId);

  return onboarded;
}

export async function transferAffiliatePayout(params: {
  partnerId: string;
  amountEur: number;
  commissionIds: string[];
}): Promise<{ ok: true; transferId: string } | { ok: false; error: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: false, error: "STRIPE_SECRET_KEY manquant." };

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("affiliate_partners")
    .select("stripe_connect_account_id, stripe_connect_onboarded")
    .eq("id", params.partnerId)
    .eq("status", "active")
    .maybeSingle();

  const accountId = partner?.stripe_connect_account_id as string | null;
  if (!accountId || !partner?.stripe_connect_onboarded) {
    return { ok: false, error: "Compte Stripe Connect non configuré." };
  }

  const stripe = new Stripe(key);
  const amountCents = Math.round(params.amountEur * 100);
  if (amountCents < 100) return { ok: false, error: "Montant trop faible." };

  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: "eur",
    destination: accountId,
    metadata: { affiliate_partner_id: params.partnerId },
  });

  await admin.from("affiliate_payouts").insert({
    partner_id: params.partnerId,
    amount_eur: params.amountEur,
    stripe_transfer_id: transfer.id,
    status: "paid",
  });

  if (params.commissionIds.length > 0) {
    await admin
      .from("affiliate_commissions")
      .update({ status: "paid" })
      .in("id", params.commissionIds)
      .eq("partner_id", params.partnerId);
  }

  return { ok: true, transferId: transfer.id };
}
