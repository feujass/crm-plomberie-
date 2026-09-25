import { backendFetch } from "@/lib/backend/server";
import {
  catalogueLimitMessage,
  iaDevisLimitMessage,
  iaDevisUsedThisMonth,
  nextIaUsage,
  type FlowoSubscriptionPlan,
} from "@/lib/plans/limits";
import { isTrialExpired, TRIAL_EXPIRED_DEVIS_MESSAGE } from "@/lib/plans/trial";
import type { BackendMeResponse, BackendOuvrage, BackendProfile } from "@/types/backend";

export type SubscriptionContext = {
  plan: FlowoSubscriptionPlan;
  profile: BackendProfile | undefined;
  ouvrageCount: number;
};

export async function loadSubscriptionContext(): Promise<SubscriptionContext> {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const plan = (me.profile?.subscription_plan ?? "free") as FlowoSubscriptionPlan;
  const ouvrages = (await backendFetch("/api/ouvrages").catch(() => [])) as BackendOuvrage[];
  return {
    plan,
    profile: me.profile,
    ouvrageCount: ouvrages.length,
  };
}

export function assertDevisCreationAllowed(ctx: SubscriptionContext): string | null {
  if (isTrialExpired(ctx.profile)) return TRIAL_EXPIRED_DEVIS_MESSAGE;
  return null;
}

export function assertIaDevisAllowed(ctx: SubscriptionContext): string | null {
  const devisBlocked = assertDevisCreationAllowed(ctx);
  if (devisBlocked) return devisBlocked;
  return iaDevisLimitMessage(ctx.plan, iaDevisUsedThisMonth(ctx.profile), ctx.profile);
}

export function assertCatalogueAllowed(ctx: SubscriptionContext, adding = 1): string | null {
  return catalogueLimitMessage(ctx.plan, ctx.ouvrageCount, adding, ctx.profile);
}

export async function recordIaDevisUsage(profile: BackendProfile | undefined): Promise<void> {
  const payload = nextIaUsage(profile);
  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
