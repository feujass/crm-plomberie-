"use client";

import { createClient } from "@/lib/supabase/client";
import { translateSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";

/** Ouvre la session Supabase dans le navigateur (IP réelle du client, pas Vercel). */
export async function signInSupabaseFromBrowser(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      return { ok: false, message: translateSupabaseAuthError(error.message) };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Connexion impossible. Réessaie dans un instant." };
  }
}
