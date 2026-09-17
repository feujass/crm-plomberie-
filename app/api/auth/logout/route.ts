import { NextResponse } from "next/server";

import { CRM_GATE_COOKIE } from "@/lib/auth/crm-gate-cookie";
import { clearAuthCookies } from "@/lib/backend/cookies";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export async function POST() {
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set(CRM_GATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  await clearAuthCookies();
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(CRM_GATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
