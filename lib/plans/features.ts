import type { FlowoSubscriptionPlan } from "@/lib/plans/limits";
import { effectiveSubscriptionPlan } from "@/lib/plans/trial";
import type { BackendProfile } from "@/types/backend";

export type GatedFeature = "facturation" | "rentabilite" | "conformite";

function featuresForPlan(plan: FlowoSubscriptionPlan): Set<GatedFeature> {
  if (plan === "pro") return new Set();
  if (plan === "pro_plus") return new Set(["facturation", "conformite"]);
  if (plan === "pme") return new Set(["facturation", "rentabilite", "conformite"]);
  // Essai gratuit (pro_plus effectif) ou legacy sans plan payant
  return new Set(["facturation", "conformite"]);
}

export function effectivePlanForFeatures(profile: BackendProfile | undefined): FlowoSubscriptionPlan {
  return effectiveSubscriptionPlan(profile);
}

export function canAccessFeature(profile: BackendProfile | undefined, feature: GatedFeature): boolean {
  const plan = effectivePlanForFeatures(profile);
  return featuresForPlan(plan).has(feature);
}

export function filterNavByPlan<T extends { href: string }>(items: T[], profile: BackendProfile | undefined): T[] {
  return items.filter((item) => {
    if (item.href === "/facturation" || item.href.startsWith("/facturation/")) {
      return canAccessFeature(profile, "facturation");
    }
    if (item.href === "/rentabilite" || item.href.startsWith("/rentabilite/")) {
      return canAccessFeature(profile, "rentabilite");
    }
    return true;
  });
}

export function facturationUpgradeMessage(): string {
  return "La facturation est incluse à partir du plan Pro+. Passez au plan supérieur pour créer et envoyer des factures.";
}
