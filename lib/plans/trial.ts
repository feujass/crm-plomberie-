import type { BackendProfile } from "@/types/backend";

type FlowoSubscriptionPlan = NonNullable<BackendProfile["subscription_plan"]>;

export const FREE_TRIAL_DAYS = 5;

export const TRIAL_EXPIRED_ACCOUNT_MESSAGE = `Votre essai gratuit de ${FREE_TRIAL_DAYS} jours est terminé. Choisissez un abonnement ci-dessous pour continuer.`;

export const TRIAL_EXPIRED_IA_MESSAGE =
  "Votre essai gratuit est terminé. Choisissez un abonnement pour continuer à utiliser Zeus.";

export const TRIAL_EXPIRED_CATALOGUE_MESSAGE =
  "Votre essai gratuit est terminé. Choisissez un abonnement pour continuer à gérer votre catalogue.";

export const TRIAL_EXPIRED_DEVIS_MESSAGE =
  "Votre essai gratuit est terminé. Choisissez un abonnement pour continuer à créer des devis.";

export function registerReassuranceLine(): string {
  return `Sans carte bancaire · ${FREE_TRIAL_DAYS} jours d'essai · Résiliable en 1 clic`;
}

export function freeTrialMarketingLine(): string {
  return `${FREE_TRIAL_DAYS} jours d'essai gratuit · Accès Pro+ · Sans carte bancaire`;
}

export function freeTrialCtaLabel(): string {
  return `Essayer Flowo gratuitement, ${FREE_TRIAL_DAYS} jours`;
}

export function trialEndsAtFromRegistration(now = new Date()): string {
  const ends = new Date(now);
  ends.setUTCDate(ends.getUTCDate() + FREE_TRIAL_DAYS);
  return ends.toISOString();
}

export function hasActivePaidPlan(profile: BackendProfile | undefined): boolean {
  const plan = profile?.subscription_plan;
  if (!plan || plan === "free") return false;
  return profile?.subscription_status === "active";
}

export function isFreeTrialActive(profile: BackendProfile | undefined, now = Date.now()): boolean {
  if (hasActivePaidPlan(profile)) return false;
  const ends = profile?.trial_ends_at;
  if (!ends) return false;
  return Date.parse(ends) > now;
}

export function isTrialExpired(profile: BackendProfile | undefined, now = Date.now()): boolean {
  if (hasActivePaidPlan(profile)) return false;
  const ends = profile?.trial_ends_at;
  if (!ends) return false;
  return Date.parse(ends) <= now;
}

/** Plan effectif pour quotas et messages (essai = Pro+). */
export function effectiveSubscriptionPlan(profile: BackendProfile | undefined): FlowoSubscriptionPlan {
  if (hasActivePaidPlan(profile) && profile?.subscription_plan && profile.subscription_plan !== "free") {
    return profile.subscription_plan;
  }
  if (isFreeTrialActive(profile)) return "pro_plus";
  return (profile?.subscription_plan ?? "free") as FlowoSubscriptionPlan;
}
