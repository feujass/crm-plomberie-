import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/backend/cookies";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export async function POST() {
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await clearAuthCookies();
  return NextResponse.json({ ok: true }, { status: 200 });
}
