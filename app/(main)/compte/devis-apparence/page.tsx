import {
  CompteLogoFormClient,
} from "@/components/compte/CompteFormsClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { ThemeToggle } from "@/components/parametres/ThemeToggle";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";
import { Palette } from "lucide-react";

export default async function CompteDevisApparencePage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  return (
    <CompteSubLayout
      title="Apparence des devis"
      description="Logo de votre entreprise et couleur principale (thème de l'application)."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="size-5 text-[color:var(--primary)]" aria-hidden />
            <p className="font-semibold text-[var(--foreground)]">Thème</p>
          </div>
          <ThemeToggle />
        </div>

        <CompteLogoFormClient defaultLogoUrl={profile.logo_url ?? ""} />
      </div>
    </CompteSubLayout>
  );
}
