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
  if (fromEnv) return fromEnv;
  if (planId === "pro" && billing === "monthly") {
    const legacy = process.env.STRIPE_PRICE_PRO?.trim();
    if (legacy) return legacy;
  }
  throw new Error(`Prix Stripe manquant (${envKey})`);
}
