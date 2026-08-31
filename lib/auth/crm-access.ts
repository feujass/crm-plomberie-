/** Profil Supabase minimal pour vérifier l'accès CRM (artisan). */
export type CrmProfileGate = {
  onboarding_steps_completed?: number | null;
  entreprise_nom?: string | null;
};

/** Compte artisan Flowo : inscription CRM complétée ou entreprise renseignée. */
export function profileHasCrmAccess(profile: CrmProfileGate | null | undefined): boolean {
  if (!profile) return false;
  const steps = Number(profile.onboarding_steps_completed ?? 0);
  if (steps >= 3) return true;
  return String(profile.entreprise_nom ?? "").trim().length > 0;
}
