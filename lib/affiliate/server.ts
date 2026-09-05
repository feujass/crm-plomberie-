import { readReferralCookie } from "@/lib/affiliate/cookies";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeReferralCode } from "@/lib/affiliate/constants";
import type { AffiliatePartner } from "@/types/affiliate";

function mapPartner(row: Record<string, unknown>): AffiliatePartner {
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    email: String(row.email ?? ""),
    display_name: String(row.display_name ?? ""),
    brand_name: String(row.brand_name ?? ""),
    referral_code: String(row.referral_code ?? ""),
    slug: String(row.slug ?? ""),
    commission_rate_percent: Number(row.commission_rate_percent ?? 20),
    status: (row.status as AffiliatePartner["status"]) ?? "pending",
    payout_min_eur: Number(row.payout_min_eur ?? 50),
    total_earned_eur: Number(row.total_earned_eur ?? 0),
    created_at: String(row.created_at ?? ""),
    stripe_connect_account_id: row.stripe_connect_account_id ? String(row.stripe_connect_account_id) : null,
    stripe_connect_onboarded: Boolean(row.stripe_connect_onboarded),
  };
}

export async function findPartnerByCode(code: string): Promise<AffiliatePartner | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliate_partners")
    .select("*")
    .eq("referral_code", normalized)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  return mapPartner(data as Record<string, unknown>);
}

export async function findPartnerByUserId(userId: string): Promise<AffiliatePartner | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("affiliate_partners").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return mapPartner(data as Record<string, unknown>);
}

export async function findPartnerByEmail(email: string): Promise<AffiliatePartner | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliate_partners")
    .select("*")
    .eq("email", normalized)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  return mapPartner(data as Record<string, unknown>);
}

async function linkPartnerToUser(partnerId: string, userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("affiliate_partners").update({ user_id: userId }).eq("id", partnerId).is("user_id", null);
}

/** Résout le partenaire actif : par user_id, sinon par e-mail (et lie le compte si besoin). */
export async function resolvePartnerForUser(
  userId: string,
  email?: string | null,
): Promise<AffiliatePartner | null> {
  const byUser = await findPartnerByUserId(userId);
  if (byUser?.status === "active") return byUser;

  if (!email) return null;
  const byEmail = await findPartnerByEmail(email);
  if (!byEmail) return null;

  if (!byEmail.user_id) {
    await linkPartnerToUser(byEmail.id, userId);
    return { ...byEmail, user_id: userId };
  }

  if (byEmail.user_id !== userId) return null;
  return byEmail;
}

export async function findPartnerById(partnerId: string): Promise<AffiliatePartner | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("affiliate_partners").select("*").eq("id", partnerId).maybeSingle();
  if (!data) return null;
  return mapPartner(data as Record<string, unknown>);
}

export async function recordAffiliateClick(params: {
  partnerId: string;
  landingPath?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}) {
  const admin = createAdminClient();
  await admin.from("affiliate_clicks").insert({
    partner_id: params.partnerId,
    landing_path: params.landingPath?.trim() || null,
    utm_source: params.utmSource?.trim() || null,
    utm_medium: params.utmMedium?.trim() || null,
    utm_campaign: params.utmCampaign?.trim() || null,
  });
}

export async function attachReferralToUser(params: { partnerId: string; userId: string }) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("affiliate_referrals")
    .select("id")
    .eq("referred_user_id", params.userId)
    .maybeSingle();
  if (existing) return;

  await admin.from("profiles").update({ referred_by_partner_id: params.partnerId }).eq("id", params.userId);
  await admin.from("affiliate_referrals").insert({
    partner_id: params.partnerId,
    referred_user_id: params.userId,
    status: "registered",
  });

  const partner = await findPartnerById(params.partnerId);
  if (partner?.email) {
    const { sendAffiliateNewReferralEmail } = await import("@/lib/affiliate/emails");
    void sendAffiliateNewReferralEmail({
      partnerEmail: partner.email,
      partnerName: partner.display_name,
      brandName: partner.brand_name,
    });
  }
}

/** Lie le filleul au partenaire si le cookie `flowo_ref` est présent (idempotent). */
export async function attachReferralFromCookie(userId: string): Promise<void> {
  try {
    const refCode = await readReferralCookie();
    if (!refCode) return;
    const partner = await findPartnerByCode(refCode);
    if (!partner) return;
    await attachReferralToUser({ partnerId: partner.id, userId });
  } catch {
    /* fire-and-forget */
  }
}

export async function recordCommissionFromInvoice(params: {
  partnerId: string;
  referredUserId: string;
  stripeInvoiceId: string;
  grossAmountEur: number;
  commissionRatePercent: number;
  periodStart?: Date | null;
}) {
  const admin = createAdminClient();
  const commissionEur = Math.round(params.grossAmountEur * (params.commissionRatePercent / 100) * 100) / 100;

  const { error } = await admin.from("affiliate_commissions").insert({
    partner_id: params.partnerId,
    referred_user_id: params.referredUserId,
    stripe_invoice_id: params.stripeInvoiceId,
    gross_amount_eur: params.grossAmountEur,
    commission_eur: commissionEur,
    status: "pending",
    period_start: params.periodStart?.toISOString() ?? null,
  });

  if (error?.code === "23505") return;

  const partnerRow = await findPartnerById(params.partnerId);
  if (partnerRow) {
    await admin
      .from("affiliate_partners")
      .update({ total_earned_eur: partnerRow.total_earned_eur + commissionEur })
      .eq("id", params.partnerId);
  }

  await admin
    .from("affiliate_referrals")
    .update({ status: "subscribed", converted_at: new Date().toISOString() })
    .eq("partner_id", params.partnerId)
    .eq("referred_user_id", params.referredUserId);

  if (partnerRow?.email) {
    const { sendAffiliateNewCommissionEmail } = await import("@/lib/affiliate/emails");
    void sendAffiliateNewCommissionEmail({
      partnerEmail: partnerRow.email,
      partnerName: partnerRow.display_name,
      brandName: partnerRow.brand_name,
      commissionEur,
      grossEur: params.grossAmountEur,
    });
  }
}
