import { CompteHubRow } from "@/components/compte/CompteHubRow";
import { CompteLogoutButton } from "@/components/compte/CompteLogoutButton";
import { CompteSection } from "@/components/compte/CompteSection";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Euro,
  FileText,
  HelpCircle,
  Home,
  BookOpen,
  Palette,
  Shield,
  SlidersHorizontal,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";

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
            <span className="mt-0.5 inline-flex rounded-full border border-[color:var(--primary)]/35 bg-[color:var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--primary)]">
              Pro
            </span>
          </div>
        </div>
        <CompteHubRow
          href="/compte/donnees"
          title="Abonnement & facturation"
          subtitle="Voir les offres et le suivi Stripe"
          Icon={CreditCard}
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
          subtitle="Nom, logo et spécialités."
          Icon={Building2}
        />
        <CompteHubRow
          href="/compte/conformite"
          title="Conformité facturation"
          subtitle="PDP, e-reporting, Chorus Pro, audit, archivage."
          Icon={Shield}
        />
        <CompteHubRow
          href="/compte/equipe"
          title="Équipe"
          subtitle="Invitez et gérez vos collaborateurs."
          Icon={UsersRound}
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
          subtitle="Face ID et suppression du compte."
          Icon={Shield}
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

      <CompteSection title="Navigation">
        <CompteHubRow href="/accueil" title="Accueil" subtitle="Tableau de bord" Icon={Home} />
        <CompteHubRow href="/rentabilite" title="Rentabilité" subtitle="Statistiques et tendances" Icon={BarChart3} />
        <CompteHubRow href="/devis" title="Devis" subtitle="Devis et propositions" Icon={FileText} />
        <CompteHubRow href="/chantiers" title="Chantiers" subtitle="Suivi des chantiers" Icon={Wrench} />
        <CompteHubRow href="/clients" title="Clients" subtitle="Carnet d'adresses" Icon={Users} />
        <CompteHubRow href="/catalogue" title="Catalogue" subtitle="Ouvrages et prix" Icon={BookOpen} />
        <CompteHubRow href="/facturation" title="Facturation" subtitle="Factures et paiements" Icon={Euro} />
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
