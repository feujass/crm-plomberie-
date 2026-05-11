import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { CompteAbonnementClient } from "@/components/compte/CompteAbonnementClient";
import { Download } from "lucide-react";
import { StripeButtons } from "@/components/parametres/StripeButtons";

export default function CompteDonneesPage() {
  return (
    <CompteSubLayout
      title="Données & abonnement"
      description="Exportez vos données et gérez votre abonnement."
    >
      <div className="space-y-4">
        <CompteAbonnementClient />

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 font-semibold text-[var(--foreground)]">Paiement & facturation</p>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Portail Stripe (si activé). Sinon, tu peux continuer à utiliser Flowo en local.
          </p>
          <StripeButtons hasStripeCustomer={false} />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <Download className="size-4" aria-hidden />
            Export RGPD
          </p>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Téléchargez une copie de vos données. Conservation des factures : obligations légales (souvent plusieurs
            années) — voir <code className="text-xs">docs/RGPD-FLOWO.md</code>.
          </p>
          <a
            href="/api/export/me"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-3.5 text-sm font-semibold text-[var(--foreground)] dark:border-gray-700 dark:bg-gray-800"
          >
            Télécharger JSON
          </a>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Export conformité (factures + transmissions + audit) : onglet{" "}
            <a href="/compte/conformite" className="text-sky-600 hover:underline">
              Conformité facturation
            </a>
            .
          </p>
        </div>
      </div>
    </CompteSubLayout>
  );
}
