import { createAdminClient } from "@/lib/supabase/admin";
import { transferAffiliatePayout } from "@/lib/affiliate/stripe-connect";

export type PayoutCronResult = {
  partnerId: string;
  ok: boolean;
  amountEur?: number;
  transferId?: string;
  error?: string;
};

export async function processAffiliatePayouts(): Promise<PayoutCronResult[]> {
  const admin = createAdminClient();
  const { data: partners } = await admin
    .from("affiliate_partners")
    .select("id, payout_min_eur, stripe_connect_onboarded")
    .eq("status", "active")
    .eq("stripe_connect_onboarded", true);

  const results: PayoutCronResult[] = [];

  for (const partner of partners ?? []) {
    const partnerId = String(partner.id);
    const minEur = Number(partner.payout_min_eur ?? 50);

    const { data: pending } = await admin
      .from("affiliate_commissions")
      .select("id, commission_eur")
      .eq("partner_id", partnerId)
      .in("status", ["pending", "approved"]);

    const rows = pending ?? [];
    const total = Math.round(rows.reduce((s, c) => s + Number(c.commission_eur), 0) * 100) / 100;
    if (total < minEur) continue;

    const transfer = await transferAffiliatePayout({
      partnerId,
      amountEur: total,
      commissionIds: rows.map((r) => String(r.id)),
    });

    if (transfer.ok) {
      results.push({ partnerId, ok: true, amountEur: total, transferId: transfer.transferId });
    } else {
      results.push({ partnerId, ok: false, error: transfer.error });
    }
  }

  return results;
}
