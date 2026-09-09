import { CompteEFacturationClient } from "@/components/compte/CompteEFacturationClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { getEInvoicingProvider } from "@/lib/facturation/pa/get-provider";
import { loadConnection } from "@/lib/facturation/pa/supabase-token-store";
import { mapRegimeTvaToSuperPdp } from "@/lib/facturation/pa/tva-mapping";
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

  const mapping = mapRegimeTvaToSuperPdp({
    regimeTva: parseRegimeTva(profile?.regime_tva),
    periodicite: profile?.tva_periodicite_declaration,
  });

  return (
    <CompteSubLayout
      title="Facturation électronique"
      description="Raccordement à la plateforme agréée (une application Flowo, votre compte entreprise)."
    >
      <CompteEFacturationClient
        initialSnapshot={snapshot}
        providerId={provider.id}
        oauthError={params.error ?? null}
        entrepriseNom={profile?.entreprise ?? null}
        siren={profile?.siren ?? null}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="font-semibold text-[var(--foreground)]">Régime TVA transmis à la PA</p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Exigibilité Flowo : <span className="font-medium">{parseRegimeTva(profile?.regime_tva)}</span>
          {" → "}
          TVA sur les débits PA :{" "}
          <span className="font-medium">{mapping.hasVatOnDebits ? "oui" : "non"}</span>
          {mapping.vatRegime ? (
            <>
              {" · "}périodicité : <span className="font-medium">{mapping.vatRegime}</span>
            </>
          ) : null}
        </p>
        {mapping.status === "incomplete" ? (
          <p className="mt-2 text-amber-800 dark:text-amber-300">
            Il manque la périodicité de déclaration (mensuel / trimestriel / régime simplifié). Renseignez-la
            dans{" "}
            <Link href="/compte/entreprise" className="underline">
              Compte → Entreprise
            </Link>
            .
          </p>
        ) : null}
      </div>
    </CompteSubLayout>
  );
}
