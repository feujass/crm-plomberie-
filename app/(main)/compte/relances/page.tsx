import { CompteRelancesFormClient } from "@/components/compte/CompteRelancesFormClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import { devisRelanceEcheances, factureRelanceEcheances, formatRelanceEcheances } from "@/lib/relances/schedule";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";

export default async function CompteRelancesPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  const devisDefault = formatRelanceEcheances(devisRelanceEcheances(profile));
  const factureDefault = formatRelanceEcheances(factureRelanceEcheances(profile));

  return (
    <CompteSubLayout
      title="Relances automatiques"
      description="Délais des relances client pour les devis envoyés et les factures impayées."
    >
      <CompteRelancesFormClient
        initial={{
          relance_devis_echeances: profile.relance_devis_echeances?.trim() || devisDefault,
          relance_facture_echeances: profile.relance_facture_echeances?.trim() || factureDefault,
        }}
      />
    </CompteSubLayout>
  );
}
