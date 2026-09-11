import { CompteHubRow } from "@/components/compte/CompteHubRow";
import { CompteLogoutButton } from "@/components/compte/CompteLogoutButton";
import { CompteSection } from "@/components/compte/CompteSection";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { backendFetch } from "@/lib/backend/server";
import { resolvePartnerForUser } from "@/lib/affiliate/server";
import { isAffiliateAdmin } from "@/lib/affiliate/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import type { BackendMeResponse } from "@/types/backend";
import { Bell, Building2, Clock, Handshake, HelpCircle, Palette, Shield, SlidersHorizontal, Users } from "lucide-react";

export default async function CompteHubPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const email = me.email ?? "";
  const displayName = [me.prenom, me.nom].filter(Boolean).join(" ").trim() || email;
  const onboardingStep = me.profile?.onboarding_step ?? 0;
  const showOnboarding = !me.profile?.onboarding_complete;
  const onboardingHref = `/onboarding/step-${Math.min(3, Math.max(1, onboardingStep + 1))}`;

  let isAffiliatePartner = false;
  let isAdmin = false;
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isAdmin = isAffiliateAdmin(user.email);
      const partner = await resolvePartnerForUser(user.id, user.email);
      isAffiliatePartner = partner?.status === "active";
    }
  } else {
    isAdmin = isAffiliateAdmin(me.email);
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 pb-6 lg:max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Mon compte</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Paramètres et raccourcis</p>
      </header>

      <CompteSection title="Connecté">
        <div className="flex items-center gap-3 py-4">
          <UserAvatar
            avatarUrl={me.profile?.avatar_url}
            prenom={me.prenom}
            nom={me.nom}
            email={email}
            size="md"
            initialsMax={2}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--foreground)]">{displayName}</p>
            {displayName !== email ? (
              <p className="truncate text-sm text-gray-600 dark:text-gray-400">{email}</p>
            ) : null}
          </div>
        </div>
        {showOnboarding ? (
          <CompteHubRow
            href={onboardingHref}
            title="Compléter mon profil"
            subtitle="Entreprise, logo, règles de devis (optionnel)."
            Icon={Building2}
          />
        ) : null}
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
          subtitle="E-mail aujourd'hui — WhatsApp bientôt."
          Icon={Bell}
        />
        <CompteHubRow
          href="/compte/securite"
          title="Sécurité"
          subtitle="Données personnelles, cookies et suppression du compte."
          Icon={Users}
        />
      </CompteSection>

      <CompteSection title="Paramètres devis">
        <CompteHubRow
          href="/compte/relances"
          title="Relances automatiques"
          subtitle="Délais J+3, J+7… pour devis et factures impayées."
          Icon={Clock}
        />
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

      {isAffiliatePartner ? (
        <CompteSection title="Partenariat">
          <CompteHubRow
            href="/partenaire"
            title="Espace partenaire"
            subtitle="Vos liens, statistiques et commissions Flowo."
            Icon={Handshake}
          />
        </CompteSection>
      ) : null}

      {isAdmin ? (
        <CompteSection title="Administration">
          <CompteHubRow
            href="/admin/affiliation"
            title="Candidatures affiliation"
            subtitle="Approuver ou refuser les demandes partenaires."
            Icon={Shield}
          />
        </CompteSection>
      ) : null}

      <CompteSection title="Assistance">
        <CompteHubRow
          href="/assistant"
          title="Zeus"
          subtitle="Réglages et chat avec votre assistant IA Flowo."
          Icon={HelpCircle}
        />
      </CompteSection>

      <CompteSection title="Session">
        <CompteLogoutButton />
      </CompteSection>
    </div>
  );
}
