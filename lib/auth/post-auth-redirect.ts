import { pendingCheckoutRedirectPath, type PendingCheckout } from "@/lib/auth/pending-checkout";

export function accueilPathWithDemoDevis(devisId: string): string {
  return `/accueil?devis_demo=${encodeURIComponent(devisId)}`;
}

export function resolvePostAuthRedirect(opts: {
  onboardingStepsCompleted: number;
  next?: string | null;
  pendingCheckout?: PendingCheckout | null;
  linkedDevisId?: string | null;
}): string {
  const checkoutPath = pendingCheckoutRedirectPath(opts.pendingCheckout ?? null);
  if (checkoutPath) return checkoutPath;

  if (opts.linkedDevisId?.trim()) {
    return accueilPathWithDemoDevis(opts.linkedDevisId.trim());
  }

  const next = opts.next?.trim();
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding")) {
    return next;
  }
  return "/accueil";
}
