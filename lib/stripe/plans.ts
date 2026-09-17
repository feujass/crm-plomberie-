export type FlowoPlanId = "pro" | "pro_plus" | "pme";
export type FlowoBilling = "monthly" | "yearly";

export function isFlowoPlanId(value: string): value is FlowoPlanId {
  return value === "pro" || value === "pro_plus" || value === "pme";
}

export function isFlowoBilling(value: string): value is FlowoBilling {
  return value === "monthly" || value === "yearly";
}

export function resolveStripePriceId(planId: FlowoPlanId, billing: FlowoBilling): string {
  const envKey = `STRIPE_PRICE_${planId.toUpperCase()}_${billing.toUpperCase()}`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith("prod_")) {
      throw new Error(
        `${envKey} contient un ID produit (prod_…). Copiez l’ID du prix (price_…) dans Stripe → Catalogue → votre produit → Tarifs.`,
      );
    }
    if (!fromEnv.startsWith("price_")) {
      throw new Error(`${envKey} doit commencer par price_ (ID du tarif Stripe, pas du produit).`);
    }
    return fromEnv;
  }
  if (planId === "pro" && billing === "monthly") {
    const legacy = process.env.STRIPE_PRICE_PRO?.trim();
    if (legacy) return legacy;
  }
  throw new Error(`Prix Stripe manquant (${envKey})`);
}

export function parseFlowoPlanId(value: string | null | undefined): FlowoPlanId | null {
  if (!value || !isFlowoPlanId(value)) return null;
  return value;
}

const PLAN_MATRIX: { plan: FlowoPlanId; billing: FlowoBilling }[] = [
  { plan: "pro", billing: "monthly" },
  { plan: "pro", billing: "yearly" },
  { plan: "pro_plus", billing: "monthly" },
  { plan: "pro_plus", billing: "yearly" },
  { plan: "pme", billing: "monthly" },
  { plan: "pme", billing: "yearly" },
];

/** Retrouve le plan Flowo à partir d’un price_id Stripe (portail client, changement de formule). */
export function resolvePlanFromStripePriceId(priceId: string | null | undefined): FlowoPlanId | null {
  if (!priceId) return null;
  for (const { plan, billing } of PLAN_MATRIX) {
    try {
      if (resolveStripePriceId(plan, billing) === priceId) return plan;
    } catch {
      // variable d’env absente en local
    }
  }
  return null;
}
