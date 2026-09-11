import { namesFromGoogleUser } from "@/lib/auth/google-metadata";
import { trialEndsAtFromRegistration } from "@/lib/plans/trial";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProfileRow(admin: ReturnType<typeof createAdminClient>, userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (data?.id) return true;
    await sleep(200);
  }
  return false;
}

/** Prépare profil + essai pour une 1ʳᵉ connexion Google (onboarding entreprise à suivre). */
export async function initOAuthGoogleProfile(user: User): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }

  await waitForProfileRow(admin, user.id);

  const { data: profile } = await admin
    .from("profiles")
    .select("prenom, nom, trial_ends_at, onboarding_steps_completed, email_facturation")
    .eq("id", user.id)
    .maybeSingle();

  const steps = Number(profile?.onboarding_steps_completed ?? 0);
  if (steps >= 3) return;

  const { prenom, nom } = namesFromGoogleUser(user);
  const update: Record<string, unknown> = {
    onboarding_steps_completed: steps > 0 ? steps : 0,
  };

  if (!profile?.trial_ends_at) {
    update.trial_ends_at = trialEndsAtFromRegistration();
  }
  if (!String(profile?.prenom ?? "").trim() && prenom) update.prenom = prenom;
  if (!String(profile?.nom ?? "").trim() && nom) update.nom = nom;
  if (!String(profile?.email_facturation ?? "").trim() && user.email) {
    update.email_facturation = user.email;
  }

  await admin.from("profiles").update(update).eq("id", user.id);

  if (prenom || nom) {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), prenom, nom },
    });
  }
}
