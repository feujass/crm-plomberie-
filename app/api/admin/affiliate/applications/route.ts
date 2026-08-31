import { createClient } from "@/lib/supabase/server";
import { isAffiliateAdmin } from "@/lib/affiliate/admin";
import { listAffiliateApplications } from "@/lib/affiliate/applications";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAffiliateAdmin(user.email)) {
    return null;
  }
  return user;
}

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "pending" | "approved" | "rejected" | null;
  const rows = await listAffiliateApplications(status ?? undefined);
  return NextResponse.json({ applications: rows });
}
