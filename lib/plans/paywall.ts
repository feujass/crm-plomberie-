export const TRIAL_EXPIRED_PAYWALL_CODE = "trial_expired";

export const DEVIS_PAYWALL_PATH = "/compte/donnees?upgrade=devis";

export function devisPaywallPath(): string {
  return DEVIS_PAYWALL_PATH;
}

type PaywallBody = { code?: string; message?: string } | null | undefined;

export function isTrialExpiredPaywallResponse(status: number, body?: PaywallBody): boolean {
  if (body?.code === TRIAL_EXPIRED_PAYWALL_CODE) return true;
  if (status === 403 && body?.message?.includes("essai gratuit est terminé")) return true;
  return false;
}

/** Redirige vers le paywall abonnement (côté navigateur uniquement). */
export function redirectToDevisPaywall(): void {
  if (typeof window !== "undefined") {
    window.location.assign(DEVIS_PAYWALL_PATH);
  }
}

/** Si la réponse indique un essai expiré, redirige et retourne true. */
export function handleTrialExpiredPaywallResponse(status: number, body?: PaywallBody): boolean {
  if (!isTrialExpiredPaywallResponse(status, body)) return false;
  redirectToDevisPaywall();
  return true;
}
