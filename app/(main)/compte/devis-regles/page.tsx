import {
  CompteDevisReglesFormClient,
} from "@/components/compte/CompteFormsClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";

export default async function CompteDevisReglesPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  return (
    <CompteSubLayout
      title="Paramètres des devis"
      description="TVA, structure et options par défaut pour vos nouveaux devis."
    >
      <CompteDevisReglesFormClient profile={profile} />
    </CompteSubLayout>
  );
}
