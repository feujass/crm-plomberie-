import { StripeButtons } from "@/components/parametres/StripeButtons";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { Download } from "lucide-react";

export default function CompteDonneesPage() {
  return (
    <CompteSubLayout
      title="Données & abonnement"
      description="Exportez vos données et gérez votre abonnement."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 font-semibold text-[var(--foreground)]">Abonnement Stripe</p>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Stripe : à rebrancher si besoin.</p>
          <StripeButtons hasStripeCustomer={false} />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <Download className="size-4" aria-hidden />
            Export RGPD
          </p>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Téléchargez une copie de vos données.</p>
          <a
            href="/api/export/me"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-3.5 text-sm font-semibold text-[var(--foreground)] dark:border-gray-700 dark:bg-gray-800"
          >
            Télécharger JSON
          </a>
        </div>
      </div>
    </CompteSubLayout>
  );
}
