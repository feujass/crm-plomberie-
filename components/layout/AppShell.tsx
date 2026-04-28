"use client";

import { APP_NAME } from "@/lib/app-branding";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV: { href: string; label: string; short: string; icon: string }[] = [
  { href: "/accueil", label: "Accueil", short: "Accueil", icon: "🏠" },
  { href: "/rentabilite", label: "Rentabilité", short: "Stats", icon: "📊" },
  { href: "/devis", label: "Devis", short: "Devis", icon: "🧾" },
  { href: "/chantiers", label: "Chantiers", short: "Chantiers", icon: "🛠️" },
  { href: "/clients", label: "Clients", short: "Clients", icon: "👥" },
  { href: "/catalogue", label: "Catalogue", short: "Ouvrages", icon: "📚" },
  { href: "/assistant", label: "Assistant IA", short: "IA", icon: "Z" },
  { href: "/facturation", label: "Facturation", short: "Factures", icon: "💶" },
  { href: "/parametres", label: "Paramètres", short: "Réglages", icon: "⚙️" },
];

function NavLink({ href, label, icon, mobile }: { href: string; label: string; icon: string; mobile?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const cls = mobile
    ? `touch-target flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
        active ? "text-sky-600" : "text-slate-500"
      }`
    : `touch-target flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      }`;
  return (
    <Link href={href} className={cls}>
      <span className="text-lg leading-none md:text-base" aria-hidden>
        {icon}
      </span>
      <span>{mobile ? label.split(" ")[0] : label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  prenom,
}: {
  children: ReactNode;
  prenom?: string | null;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950 md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">{APP_NAME}</p>
          {prenom ? <p className="truncate text-sm text-slate-600 dark:text-slate-400">Bonjour {prenom}</p> : null}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{APP_NAME}</span>
          {prenom ? <span className="text-sm text-slate-500">{prenom}</span> : null}
        </header>
        <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {NAV.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.short} icon={item.icon} mobile />
        ))}
      </nav>
    </div>
  );
}
