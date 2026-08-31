import { pendingCheckoutRedirectPath, type PendingCheckout } from "@/lib/auth/pending-checkout";

export function resolvePostAuthRedirect(opts: {
  onboardingStepsCompleted: number;
  next?: string | null;
  pendingCheckout?: PendingCheckout | null;
}): string {
  const checkoutPath = pendingCheckoutRedirectPath(opts.pendingCheckout ?? null);
  if (checkoutPath) return checkoutPath;

  const next = opts.next?.trim();
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding")) {
    return next;
  }
  return "/accueil";
}
