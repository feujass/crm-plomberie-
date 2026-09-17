import { isFlowoBilling, isFlowoPlanId } from "@/lib/stripe/plans";

export const PENDING_CHECKOUT_COOKIE = "flowo_pending_checkout";

export type PendingCheckout = { plan: string; billing: string };

export function parsePendingCheckout(raw: string | undefined | null): PendingCheckout | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { plan?: string; billing?: string };
    const plan = String(parsed.plan ?? "").trim();
    const billing = String(parsed.billing ?? "").trim();
    if (!isFlowoPlanId(plan) || !isFlowoBilling(billing)) return null;
    return { plan, billing };
  } catch {
    return null;
  }
}

export function pendingCheckoutRedirectPath(checkout: PendingCheckout | null): string | null {
  if (!checkout) return null;
  const params = new URLSearchParams({
    checkout: "1",
    plan: checkout.plan,
    billing: checkout.billing,
  });
  return `/compte/donnees?${params.toString()}`;
}
