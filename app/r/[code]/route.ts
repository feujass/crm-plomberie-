import { NextResponse } from "next/server";

import { AFFILIATE_REF_COOKIE, AFFILIATE_REF_MAX_AGE_DAYS, normalizeReferralCode } from "@/lib/affiliate/constants";
import { findPartnerByCode, recordAffiliateClick } from "@/lib/affiliate/server";

type Params = { params: Promise<{ code: string }> };

export async function GET(req: Request, { params }: Params) {
  const { code } = await params;
  const partner = await findPartnerByCode(code);
  if (!partner) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const url = new URL(req.url);
  await recordAffiliateClick({
    partnerId: partner.id,
    landingPath: url.pathname,
    utmSource: url.searchParams.get("utm_source"),
    utmMedium: url.searchParams.get("utm_medium"),
    utmCampaign: url.searchParams.get("utm_campaign"),
  });

  const redirectTo = url.searchParams.get("to");
  const target = redirectTo?.startsWith("/") ? new URL(redirectTo, url.origin) : new URL("/", url.origin);

  const res = NextResponse.redirect(target);
  const maxAge = AFFILIATE_REF_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = url.protocol === "https:";
  res.cookies.set(AFFILIATE_REF_COOKIE, normalizeReferralCode(partner.referral_code), {
    path: "/",
    maxAge,
    sameSite: "lax",
    secure,
    httpOnly: false,
  });
  return res;
}
