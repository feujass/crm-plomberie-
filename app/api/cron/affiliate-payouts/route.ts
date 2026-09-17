import { assertCronSecret } from "@/lib/cron-auth";
import { processAffiliatePayouts } from "@/lib/affiliate/payouts";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const results = await processAffiliatePayouts();
  const paid = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok: true,
    processed: results.length,
    paid: paid.length,
    failed: failed.length,
    results,
  });
}
