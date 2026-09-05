import {
  CompteProfilFormClient,
} from "@/components/compte/CompteFormsClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";

export default async function CompteProfilPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (await backendFetch("/api/profile").catch(() => ({}))) as BackendProfile;

  return (
    <CompteSubLayout
      title="Informations personnelles"
      description="Vos informations visibles sur les documents et dans l'application."
    >
      <CompteProfilFormClient
        email={me.email ?? ""}
        initial={{
          prenom: me.prenom ?? "",
          nom: me.nom ?? "",
          tel: profile.tel ?? "",
          avatar_url: profile.avatar_url ?? "",
        }}
      />
    </CompteSubLayout>
  );
}
