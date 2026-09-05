import {
  CompteEntrepriseFormClient,
} from "@/components/compte/CompteFormsClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";

export default async function CompteEntreprisePage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  return (
    <CompteSubLayout
      title="Entreprise"
      description="Gérez votre identité, votre logo et vos spécialités."
    >
      <CompteEntrepriseFormClient profile={profile} />
    </CompteSubLayout>
  );
}
