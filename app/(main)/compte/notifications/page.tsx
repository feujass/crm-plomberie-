import { CompteNotificationsClient } from "@/components/compte/CompteNotificationsClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";

export default async function CompteNotificationsPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  return (
    <CompteSubLayout
      title="Notifications"
      description="E-mail disponible aujourd'hui — WhatsApp, SMS et push arrivent prochainement."
    >
      <CompteNotificationsClient profile={profile} email={me.email ?? ""} />
    </CompteSubLayout>
  );
}
