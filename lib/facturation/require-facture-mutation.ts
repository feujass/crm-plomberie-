import { assertFeatureApi, loadProfileForGating } from "@/lib/plans/require-feature";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireFactureMutation(): Promise<
  { supabase: SupabaseClient; user: User } | { response: NextResponse }
> {
  const profile = await loadProfileForGating();
  const blocked = assertFeatureApi(profile, "facturation");
  if (blocked) {
    return { response: NextResponse.json({ message: blocked }, { status: 403 }) };
  }

  let supabase: SupabaseClient;
  try {
    supabase = await createClient();
  } catch {
    return { response: NextResponse.json({ message: "Supabase n’est pas configuré." }, { status: 503 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ message: "Non authentifié" }, { status: 401 }) };
  }
  return { supabase, user };
}
