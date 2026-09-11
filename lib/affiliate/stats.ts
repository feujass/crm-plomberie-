import { createClient } from "@/lib/supabase/server";
import type {
  AffiliateCommissionRow,
  AffiliateMonthlyPoint,
  AffiliatePartner,
  AffiliateReferralRow,
  AffiliateStats,
} from "@/types/affiliate";

const PLAN_MRR_EUR: Record<string, number> = {
  pro: 19,
  pro_plus: 29,
  pme: 49,
};

export async function loadAffiliateDashboard(partner: AffiliatePartner) {
  const supabase = await createClient();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [clicksRes, referralsRes, commissionsRes] = await Promise.all([
    supabase.from("affiliate_clicks").select("id, created_at").eq("partner_id", partner.id),
    supabase
      .from("affiliate_referrals")
      .select("id, status, subscribed_plan, created_at, converted_at, referred_user_id")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select("id, gross_amount_eur, commission_eur, status, created_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
  ]);

  const clicks = clicksRes.data ?? [];
  const referrals = referralsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  const clicks30d = clicks.filter((c) => String(c.created_at) >= since30d).length;
  const signupsTotal = referrals.length;
  const trialsActive = referrals.filter((r) => r.status === "registered" || r.status === "trialing").length;
  const subscribersActive = referrals.filter((r) => r.status === "subscribed").length;

  let mrrAttributed = 0;
  for (const r of referrals) {
    if (r.status === "subscribed" && r.subscribed_plan) {
      mrrAttributed += PLAN_MRR_EUR[String(r.subscribed_plan)] ?? 0;
    }
  }

  const commissionsPending = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.commission_eur), 0);
  const commissionsPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.commission_eur), 0);

  const conversionRate = clicks30d > 0 ? Math.round((signupsTotal / clicks30d) * 1000) / 10 : 0;

  const stats: AffiliateStats = {
    clicks_30d: clicks30d,
    signups_total: signupsTotal,
    trials_active: trialsActive,
    subscribers_active: subscribersActive,
    mrr_attributed_eur: mrrAttributed,
    commissions_pending_eur: Math.round(commissionsPending * 100) / 100,
    commissions_paid_eur: Math.round(commissionsPaid * 100) / 100,
    conversion_rate: conversionRate,
  };

  const monthly = buildMonthlySeries(clicks, referrals, commissions);

  const referralRows: AffiliateReferralRow[] = referrals.slice(0, 20).map((r) => ({
    id: String(r.id),
    status: r.status as AffiliateReferralRow["status"],
    subscribed_plan: r.subscribed_plan ? String(r.subscribed_plan) : null,
    created_at: String(r.created_at),
    converted_at: r.converted_at ? String(r.converted_at) : null,
  }));

  const commissionRows: AffiliateCommissionRow[] = commissions.slice(0, 20).map((c) => ({
    id: String(c.id),
    gross_amount_eur: Number(c.gross_amount_eur),
    commission_eur: Number(c.commission_eur),
    status: c.status as AffiliateCommissionRow["status"],
    created_at: String(c.created_at),
  }));

  return { stats, monthly, referralRows, commissionRows };
}

function buildMonthlySeries(
  clicks: { created_at: string }[],
  referrals: { created_at: string }[],
  commissions: { created_at: string; commission_eur: number }[],
): AffiliateMonthlyPoint[] {
  const buckets = new Map<string, AffiliateMonthlyPoint>();
  const add = (date: string, field: "clicks" | "signups" | "commissions_eur", value = 1) => {
    const month = date.slice(0, 7);
    const row = buckets.get(month) ?? { month, clicks: 0, signups: 0, commissions_eur: 0 };
    if (field === "commissions_eur") row.commissions_eur += value;
    else row[field] += value;
    buckets.set(month, row);
  };

  for (const c of clicks) add(String(c.created_at), "clicks");
  for (const r of referrals) add(String(r.created_at), "signups");
  for (const c of commissions) add(String(c.created_at), "commissions_eur", Number(c.commission_eur));

  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
}
