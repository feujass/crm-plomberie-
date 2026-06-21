import { CompteAbonnementClient } from "@/components/compte/CompteAbonnementClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { StripeBillingPortalButton } from "@/components/stripe/StripeBillingPortalButton";
import { StripeCheckoutAutoRedirect } from "@/components/stripe/StripeCheckoutAutoRedirect";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";

type Search = {
  stripe?: string;
  checkout?: string;
  plan?: string;
  billing?: string;
};

export default async function CompteDonneesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = me.profile;
  const hasStripeCustomer = Boolean(profile?.stripe_customer_id);
  const planLabel = profile?.subscription_plan && profile.subscription_plan !== "free" ? profile.subscription_plan : null;

  return (
    <CompteSubLayout title="Données & abonnement" description="Gérez votre offre Flowo et vos paiements Stripe.">
      {sp.stripe === "success" ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          Paiement confirmé — votre abonnement sera actif dans quelques instants.
        </p>
      ) : null}
      {sp.stripe === "cancel" ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Paiement annulé. Vous pouvez réessayer quand vous voulez.
        </p>
      ) : null}

      {planLabel ? (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Offre actuelle : <span className="font-semibold text-[var(--foreground)]">{planLabel.toUpperCase()}</span>
          {profile?.subscription_status ? ` · ${profile.subscription_status}` : null}
        </p>
      ) : null}

      <CompteAbonnementClient />
      {hasStripeCustomer ? (
        <div className="mt-4">
          <StripeBillingPortalButton />
        </div>
      ) : null}

      <StripeCheckoutAutoRedirect plan={sp.plan} billing={sp.billing} autoCheckout={sp.checkout === "1"} />
    </CompteSubLayout>
  );
}
