import { resolvePartnerForUser } from "@/lib/affiliate/server";
import { loadAffiliateDashboard } from "@/lib/affiliate/stats";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  const dashboard = await loadAffiliateDashboard(partner);
  return NextResponse.json({ partner, ...dashboard });
}
