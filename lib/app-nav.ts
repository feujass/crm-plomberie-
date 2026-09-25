import { BarChart3, BookOpen, Euro, FileText, Home, Plus, Receipt, type LucideIcon, UserCircle, Users } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  href: string;
  label: string;
  short?: string;
  Icon: LucideIcon | ComponentType<{ className?: string }>;
  /** Bouton central type Instagram / TikTok. */
  emphasis?: "create";
  /** Autres préfixes considérés comme « actif » (ex. Tarifs dans Devis). */
  alsoMatch?: string[];
};

/** Navigation principale (mobile + desktop). */
export const NAV_PRIMARY: NavItem[] = [
  { href: "/accueil", label: "Accueil", short: "Accueil", Icon: Home },
  { href: "/devis", label: "Devis", short: "Devis", Icon: FileText },
  { href: "/clients", label: "Clients", short: "Clients", Icon: Users },
  { href: "/compte", label: "Mon compte", short: "Compte", Icon: UserCircle },
];

/** Navigation secondaire (sidebar desktop uniquement). */
export const NAV_SECONDARY: NavItem[] = [
  { href: "/rentabilite", label: "Rentabilité", Icon: BarChart3 },
  { href: "/catalogue", label: "Catalogue", Icon: BookOpen },
  { href: "/facturation", label: "Facturation", Icon: Euro },
];

export const NAV_DESKTOP: NavItem[] = [...NAV_PRIMARY.filter((i) => i.href !== "/compte"), ...NAV_SECONDARY, NAV_PRIMARY.find((i) => i.href === "/compte")!];

/** Menu bas mobile — 5 onglets type Instagram (Tarifs est dans Devis). */
export const NAV_MOBILE: NavItem[] = [
  { href: "/accueil", label: "Accueil", short: "Accueil", Icon: Home },
  { href: "/clients", label: "Clients", short: "Clients", Icon: Users },
  {
    href: "/devis",
    label: "Devis",
    short: "Devis",
    Icon: Plus,
    emphasis: "create",
    alsoMatch: ["/catalogue"],
  },
  { href: "/facturation", label: "Facturation", short: "Factures", Icon: Receipt },
  { href: "/compte", label: "Mon compte", short: "Compte", Icon: UserCircle },
];
