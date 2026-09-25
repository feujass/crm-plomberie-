/** Colonnes lues pour le garde d'accès CRM (login, middleware, layout). */
export const CRM_PROFILE_GATE_SELECT =
  "onboarding_steps_completed, entreprise_nom, trial_ends_at, privacy_accepted_at";

/** Profil Supabase minimal pour vérifier l'accès CRM (artisan). */
export type CrmProfileGate = {
  onboarding_steps_completed?: number | null;
  entreprise_nom?: string | null;
  trial_ends_at?: string | null;
  privacy_accepted_at?: string | null;
};

/** Inscription progressive (email-only) ou onboarding / entreprise complétés. */
export function profileHasCrmAccess(profile: CrmProfileGate | null | undefined): boolean {
  if (!profile) return false;
  if (profile.privacy_accepted_at) return true;
  if (profile.trial_ends_at) return true;
  const steps = Number(profile.onboarding_steps_completed ?? 0);
  if (steps >= 3) return true;
  return String(profile.entreprise_nom ?? "").trim().length > 0;
}

/** Onboarding forcé uniquement pour les comptes legacy sans inscription progressive. */
export function shouldForceOnboarding(profile: CrmProfileGate | null | undefined): boolean {
  if (!profileHasCrmAccess(profile)) return false;
  const steps = Number(profile?.onboarding_steps_completed ?? 0);
  if (steps >= 3) return false;
  if (profile?.privacy_accepted_at || profile?.trial_ends_at) return false;
  return true;
}

export function logCrmAccessDenied(
  context: string,
  userId: string,
  email: string | null | undefined,
  profile: CrmProfileGate | null | undefined,
): void {
  console.error(`[${context}] CRM access denied`, {
    userId,
    email: email ?? null,
    profileExists: Boolean(profile),
    steps: profile?.onboarding_steps_completed ?? null,
    hasEntreprise: Boolean(String(profile?.entreprise_nom ?? "").trim()),
    hasTrial: Boolean(profile?.trial_ends_at),
    hasPrivacy: Boolean(profile?.privacy_accepted_at),
  });
}
