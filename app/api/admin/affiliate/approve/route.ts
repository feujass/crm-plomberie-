import { createClient } from "@/lib/supabase/server";
import { isAffiliateAdmin } from "@/lib/affiliate/admin";
import { approveAffiliateApplication } from "@/lib/affiliate/applications";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAffiliateAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    application_id?: string;
    referral_code?: string;
    slug?: string;
    user_id?: string;
  } | null;

  const applicationId = body?.application_id?.trim();
  if (!applicationId) {
    return NextResponse.json({ error: "application_id requis." }, { status: 400 });
  }

  const result = await approveAffiliateApplication({
    applicationId,
    referralCode: body?.referral_code,
    slug: body?.slug,
    userId: body?.user_id,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    partner_id: result.partnerId,
    referral_code: result.referralCode,
  });
}
