import { approveAffiliateApplication } from "@/lib/affiliate/applications";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function authorizeInternal(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeInternal(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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

  let userId = body?.user_id?.trim() || null;
  if (!userId) {
    const admin = createAdminClient();
    const { data: app } = await admin
      .from("affiliate_applications")
      .select("email")
      .eq("id", applicationId)
      .maybeSingle();
    if (app?.email) {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const match = users.users.find((u) => u.email?.toLowerCase() === String(app.email).toLowerCase());
      userId = match?.id ?? null;
    }
  }

  const result = await approveAffiliateApplication({
    applicationId,
    referralCode: body?.referral_code,
    slug: body?.slug,
    userId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    partner_id: result.partnerId,
    referral_code: result.referralCode,
  });
}
