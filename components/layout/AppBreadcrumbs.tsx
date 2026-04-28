"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SEGMENT_LABELS: Record<string, string> = {
  accueil: "Accueil",
  rentabilite: "Rentabilité",
  devis: "Devis",
  chantiers: "Chantiers",
  clients: "Clients",
  catalogue: "Catalogue",
  assistant: "Assistant IA",
  facturation: "Facturation",
  parametres: "Paramètres",
  compte: "Mon compte",
  profil: "Profil",
  entreprise: "Entreprise",
  equipe: "Équipe",
  notifications: "Notifications",
  securite: "Sécurité",
  donnees: "Données",
  "devis-apparence": "Apparence devis",
  "devis-regles": "Règles devis",
  onboarding: "Onboarding",
  nouveau: "Nouveau",
  login: "Connexion",
  register: "Inscription",
};

function labelForSegment(segment: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Fiche";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname === "/" ? ["accueil"] : pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, i) => ({
    href: `/${segments.slice(0, i + 1).join("/")}`,
    label: labelForSegment(seg),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Fil d'Ariane" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm sm:gap-x-2">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex min-w-0 items-center gap-x-1 sm:gap-x-2">
            {i > 0 ? <ChevronRight className="size-4 shrink-0 text-gray-600 dark:text-gray-400" aria-hidden /> : null}
            {c.isLast ? (
              <span className="truncate font-medium text-gray-900 dark:text-gray-50">{c.label}</span>
            ) : (
              <Link
                href={c.href}
                className="truncate text-gray-500 transition hover:text-gray-800 dark:text-gray-400 hover:dark:text-gray-200"
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
