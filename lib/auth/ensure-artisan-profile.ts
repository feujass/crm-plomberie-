import { PRIVACY_POLICY_VERSION } from "@/lib/legal/constants";
import { trialEndsAtFromRegistration } from "@/lib/plans/trial";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveMinimalSupabaseProfile } from "@/lib/supabase/save-profile";

type ProfileRow = {
  id: string;
  trial_ends_at?: string | null;
  privacy_accepted_at?: string | null;
  email_facturation?: string | null;
};

/** Répare un profil artisan incomplet (inscription progressive ou trigger seul). */
export async function ensureArtisanProfile(
  userId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, trial_ends_at, privacy_accepted_at, email_facturation")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.id) {
    const saved = await saveMinimalSupabaseProfile(userId, email);
    if (!saved.ok) return saved;
    const { error } = await admin
      .from("profiles")
      .update({
        privacy_accepted_at: new Date().toISOString(),
        privacy_policy_version: PRIVACY_POLICY_VERSION,
      })
      .eq("id", userId);
    if (error) {
      console.error("[ensureArtisanProfile] privacy update failed", error.message);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  const row = profile as ProfileRow;
  const isArtisanSignup =
    Boolean(row.privacy_accepted_at) || Boolean(String(row.email_facturation ?? "").trim());
  if (!isArtisanSignup) return { ok: true };

  const patch: Record<string, unknown> = {};
  if (!row.trial_ends_at) patch.trial_ends_at = trialEndsAtFromRegistration();
  if (!String(row.email_facturation ?? "").trim()) patch.email_facturation = email;
  if (!row.privacy_accepted_at) {
    patch.privacy_accepted_at = new Date().toISOString();
    patch.privacy_policy_version = PRIVACY_POLICY_VERSION;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) {
    console.error("[ensureArtisanProfile] patch failed", error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
