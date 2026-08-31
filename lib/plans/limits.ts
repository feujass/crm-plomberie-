import type { BackendProfile } from "@/types/backend";
import { effectiveSubscriptionPlan, isTrialExpired, TRIAL_EXPIRED_CATALOGUE_MESSAGE, TRIAL_EXPIRED_IA_MESSAGE } from "@/lib/plans/trial";

export type FlowoSubscriptionPlan = NonNullable<BackendProfile["subscription_plan"]>;

export type PlanLimits = {
  iaDevisPerMonth: number | null;
  catalogueMax: number | null;
};

const PRO_LIMITS: PlanLimits = {
  iaDevisPerMonth: 25,
  catalogueMax: 30,
};

const PRO_PLUS_LIMITS: PlanLimits = {
  iaDevisPerMonth: 80,
  catalogueMax: null,
};

const PME_LIMITS: PlanLimits = {
  iaDevisPerMonth: null,
  catalogueMax: null,
};

const EXPIRED_TRIAL_LIMITS: PlanLimits = {
  iaDevisPerMonth: 0,
  catalogueMax: 0,
};

const UNLIMITED: PlanLimits = {
  iaDevisPerMonth: null,
  catalogueMax: null,
};

export function planLimits(
  plan: FlowoSubscriptionPlan | undefined | null,
  profile?: BackendProfile,
): PlanLimits {
  if (isTrialExpired(profile)) return EXPIRED_TRIAL_LIMITS;
  const effective = profile ? effectiveSubscriptionPlan(profile) : (plan ?? "free");
  if (effective === "pro") return PRO_LIMITS;
  if (effective === "pro_plus") return PRO_PLUS_LIMITS;
  if (effective === "pme") return PME_LIMITS;
  return UNLIMITED;
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function iaDevisUsedThisMonth(profile: BackendProfile | undefined): number {
  const month = profile?.ia_devis_month;
  if (month !== currentMonthKey()) return 0;
  return Math.max(0, Number(profile?.ia_devis_count ?? 0));
}

export function iaDevisLimitMessage(
  plan: FlowoSubscriptionPlan | undefined | null,
  used: number,
  profile?: BackendProfile,
): string | null {
  if (isTrialExpired(profile)) {
    return TRIAL_EXPIRED_IA_MESSAGE;
  }
  const effective = profile ? effectiveSubscriptionPlan(profile) : (plan ?? "free");
  const { iaDevisPerMonth } = planLimits(effective, profile);
  if (iaDevisPerMonth == null || used < iaDevisPerMonth) return null;
  if (effective === "pro_plus") {
    return `Limite du plan Pro+ atteinte : ${iaDevisPerMonth} devis avec IA ce mois-ci. Passez au plan PME pour un quota Zeus illimité.`;
  }
  if (effective === "pme") {
    return `Limite du plan PME atteinte : ${iaDevisPerMonth} devis avec IA ce mois-ci. Réessayez le mois prochain ou contactez le support.`;
  }
  return `Limite du plan Pro atteinte : ${iaDevisPerMonth} devis avec IA ce mois-ci. Passez au plan Pro+ pour 80 devis Zeus par mois.`;
}

export function catalogueLimitMessage(
  plan: FlowoSubscriptionPlan | undefined | null,
  currentCount: number,
  adding = 1,
  profile?: BackendProfile,
): string | null {
  if (isTrialExpired(profile)) {
    return TRIAL_EXPIRED_CATALOGUE_MESSAGE;
  }
  const effective = profile ? effectiveSubscriptionPlan(profile) : (plan ?? "free");
  const { catalogueMax } = planLimits(effective, profile);
  if (catalogueMax == null || currentCount + adding <= catalogueMax) return null;
  const remaining = Math.max(0, catalogueMax - currentCount);
  if (remaining === 0) {
    return `Limite du plan Pro atteinte : ${catalogueMax} prix personnalisés (fournitures/ouvrages). Passez au plan Pro+ pour un catalogue illimité.`;
  }
  return `Il vous reste ${remaining} emplacement(s) catalogue sur le plan Pro (max. ${catalogueMax}). Réduisez le nombre d’articles ou passez au plan Pro+.`;
}

export function nextIaUsage(profile: BackendProfile | undefined): { ia_devis_month: string; ia_devis_count: number } {
  const month = currentMonthKey();
  const used = iaDevisUsedThisMonth(profile);
  return { ia_devis_month: month, ia_devis_count: used + 1 };
}
