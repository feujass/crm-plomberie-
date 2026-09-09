import { CompteEFacturationClient } from "@/components/compte/CompteEFacturationClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { loadConnection } from "@/lib/facturation/pa/supabase-token-store";
import { artisanTvaSummary, mapRegimeTvaToSuperPdp } from "@/lib/facturation/pa/tva-mapping";
import type { ConnectionSnapshot } from "@/lib/facturation/pa/types";
import { parseRegimeTva } from "@/lib/facturation/regime-tva";
import { requireFeature } from "@/lib/plans/require-feature";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function disconnected(provider: ConnectionSnapshot["provider"]): ConnectionSnapshot {
  return {
    status: "disconnected",
    provider,
    providerCompanyId: null,
    companyVerificationStatus: null,
    lastError: null,
    connectedAt: null,
    updatedAt: null,
  };
}

export default async function CompteEFacturationPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const profile = await requireFeature("conformite");
  const provider = getEInvoicingProvider();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = searchParams ? await searchParams : {};

  let snapshot = disconnected(provider.id);
  if (user) {
    try {
      snapshot = (await loadConnection(supabase, user.id, provider.id)).snapshot;
    } catch {
      snapshot = disconnected(provider.id);
    }
  }

  const regimeTva = parseRegimeTva(profile?.regime_tva);
  const mapping = mapRegimeTvaToSuperPdp({
    regimeTva,
    periodicite: profile?.tva_periodicite_declaration,
  });
  const tvaLines = artisanTvaSummary(regimeTva, mapping);

  return (
    <CompteSubLayout
      title="Facturation électronique"
      description="Factur-X (EN 16931 / CIUS-FR). Le dépôt auprès d’une plateforme agréée n’est pas encore actif."
    >
      <CompteEFacturationClient
        initialSnapshot={snapshot}
        providerId={provider.id}
        oauthError={params.error ?? null}
        entrepriseNom={profile?.entreprise ?? null}
        siren={profile?.siren ?? null}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {mapping.status === "incomplete" ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Il manque votre périodicité de déclaration de TVA (mensuelle, trimestrielle ou régime simplifié).
            Renseignez-la dans{" "}
            <Link href="/compte/entreprise" className="font-medium underline">
              Compte → Entreprise
            </Link>
            .
          </p>
        ) : null}
        <p className="font-semibold text-[var(--foreground)]">Régime TVA transmis à la PA</p>
        {tvaLines.map((line) => (
          <p key={line} className="mt-2 text-gray-600 dark:text-gray-400">
            {line}
          </p>
        ))}
      </div>
    </CompteSubLayout>
  );
}
