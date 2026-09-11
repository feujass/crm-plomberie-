import { CompteLogoFormClient } from "@/components/compte/CompteFormsClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";

export default async function CompteDevisApparencePage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  return (
    <CompteSubLayout
      title="Apparence des devis"
      description="Logo affiché sur vos devis et factures PDF."
    >
      <CompteLogoFormClient defaultLogoUrl={profile.logo_url ?? ""} />
    </CompteSubLayout>
  );
}
