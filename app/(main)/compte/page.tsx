import { CompteHubRow } from "@/components/compte/CompteHubRow";
import { CompteLogoutButton } from "@/components/compte/CompteLogoutButton";
import { CompteSection } from "@/components/compte/CompteSection";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";
import { Bell, Building2, HelpCircle, Palette, SlidersHorizontal, Users } from "lucide-react";

export default async function CompteHubPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const email = me.email ?? "";

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Mon compte</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Paramètres et raccourcis</p>
      </header>

      <CompteSection title="Connecté">
        <div className="flex items-center gap-3 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <Users className="size-5 text-gray-700 dark:text-gray-300" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--foreground)]">{email}</p>
          </div>
        </div>
        <CompteHubRow
          href="/onboarding/step-1"
          title="Compléter mon profil"
          subtitle="Entreprise, logo, règles de devis (optionnel)."
          Icon={Building2}
        />
      </CompteSection>

      <CompteSection title="Paramètres personnels">
        <CompteHubRow
          href="/compte/profil"
          title="Profil"
          subtitle="Nom, photo, téléphone et adresse mail."
          Icon={Users}
        />
        <CompteHubRow
          href="/compte/entreprise"
          title="Entreprise"
          subtitle="Nom, logo, métier et spécialités."
          Icon={Building2}
        />
        <CompteHubRow
          href="/compte/notifications"
          title="Notifications"
          subtitle="Push, e-mail, SMS et WhatsApp."
          Icon={Bell}
        />
        <CompteHubRow
          href="/compte/securite"
          title="Sécurité"
          subtitle="Mot de passe et suppression du compte."
          Icon={Users}
        />
      </CompteSection>

      <CompteSection title="Paramètres devis">
        <CompteHubRow
          href="/compte/devis-apparence"
          title="Apparence"
          subtitle="Logo de votre entreprise et couleur principale."
          Icon={Palette}
        />
        <CompteHubRow
          href="/compte/devis-regles"
          title="Paramètres"
          subtitle="TVA, structure des devis et options par défaut."
          Icon={SlidersHorizontal}
        />
      </CompteSection>

      <CompteSection title="Abonnement">
        <CompteHubRow
          href="/compte/donnees"
          title="Données & abonnement"
          subtitle="Choisir une offre et payer via Stripe."
          Icon={SlidersHorizontal}
        />
      </CompteSection>

      <CompteSection title="Assistance">
        <CompteHubRow
          href="/assistant"
          title="Aide et contact"
          subtitle="Posez vos questions à l'assistant Flowo."
          Icon={HelpCircle}
        />
      </CompteSection>

      <CompteSection title="Session">
        <CompteLogoutButton />
      </CompteSection>
    </div>
  );
}
