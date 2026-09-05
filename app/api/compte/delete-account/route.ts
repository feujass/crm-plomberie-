import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import { backendFetch } from "@/lib/backend/server";
import { NextResponse } from "next/server";

export async function POST() {
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = createAdminClient();

    const buckets = ["logos", "chantiers", "devis-imports"] as const;
    for (const bucket of buckets) {
      const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 500 });
      if (files?.length) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await admin.storage.from(bucket).remove(paths);
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, redirect: "/login?deleted=1" });
  }

  try {
    await backendFetch("/api/auth/me", { method: "DELETE" });
    return NextResponse.json({ ok: true, redirect: "/login?deleted=1" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suppression impossible";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
