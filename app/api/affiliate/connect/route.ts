import { createClient } from "@/lib/supabase/server";
import { resolvePartnerForUser } from "@/lib/affiliate/server";
import {
  createStripeConnectOnboardingLink,
  refreshStripeConnectOnboarded,
} from "@/lib/affiliate/stripe-connect";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const partner = await resolvePartnerForUser(user.id, user.email);
  if (!partner || partner.status !== "active") {
    return NextResponse.json({ error: "Accès partenaire non autorisé" }, { status: 403 });
  }

  const result = await createStripeConnectOnboardingLink({
    partnerId: partner.id,
    userId: user.id,
    email: user.email,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ url: result.url });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const partner = await resolvePartnerForUser(user.id, user.email);
  if (!partner || partner.status !== "active") {
    return NextResponse.json({ error: "Accès partenaire non autorisé" }, { status: 403 });
  }

  const onboarded = partner.stripe_connect_account_id
    ? await refreshStripeConnectOnboarded(partner.id)
    : false;

  return NextResponse.json({
    accountId: partner.stripe_connect_account_id ?? null,
    onboarded,
  });
}
