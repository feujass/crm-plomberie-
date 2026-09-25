import {
  checkRateLimit,
  clientIp,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { submitAffiliateApplication, type AffiliateAudienceType } from "@/lib/affiliate/applications";
import { NextResponse } from "next/server";

const APPLY_LIMIT = { max: 3, windowMs: 60 * 60_000 };

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = checkRateLimit(rateLimitKey(ip, "affiliateApply"), APPLY_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });

  const rawAudience = String(body.audience_type ?? "").trim() as AffiliateAudienceType;
  const result = await submitAffiliateApplication({
    display_name: String(body.display_name ?? ""),
    email: String(body.email ?? ""),
    brand_name: String(body.brand_name ?? ""),
    phone: body.phone ? String(body.phone) : undefined,
    audience_type: rawAudience || undefined,
    audience_size: body.audience_size ? String(body.audience_size) : undefined,
    website_or_social: body.website_or_social ? String(body.website_or_social) : undefined,
    pitch: String(body.pitch ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
