import { NextResponse } from "next/server";

import { findPartnerByCode, recordAffiliateClick } from "@/lib/affiliate/server";
import { normalizeReferralCode } from "@/lib/affiliate/constants";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    code?: string;
    landing_path?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  } | null;

  const code = normalizeReferralCode(String(body?.code ?? ""));
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  const partner = await findPartnerByCode(code);
  if (!partner) return NextResponse.json({ ok: false }, { status: 404 });

  await recordAffiliateClick({
    partnerId: partner.id,
    landingPath: body?.landing_path,
    utmSource: body?.utm_source,
    utmMedium: body?.utm_medium,
    utmCampaign: body?.utm_campaign,
  });

  return NextResponse.json({ ok: true });
}
