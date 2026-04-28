"use client";

import {
  BarChart3,
  BookOpen,
  Euro,
  FileText,
  HelpCircle,
  Home,
  Settings,
  type LucideIcon,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PlombiAppSidebar } from "@/components/layout/PlombiAppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/planner/Sidebar";
import { useIsMobile } from "@/lib/useMobile";
import { cx, focusRing } from "@/lib/utils";

import { APP_LOGO_MARK_SRC, APP_NAME } from "@/lib/app-branding";

import { AppBreadcrumbs } from "./AppBreadcrumbs";

const NAV: { href: string; label: string; short: string; Icon: LucideIcon }[] = [
  { href: "/accueil", label: "Accueil", short: "Accueil", Icon: Home },
  { href: "/rentabilite", label: "Rentabilité", short: "Stats", Icon: BarChart3 },
  { href: "/devis", label: "Devis", short: "Devis", Icon: FileText },
  { href: "/chantiers", label: "Chantiers", short: "Chantiers", Icon: Wrench },
  { href: "/clients", label: "Clients", short: "Clients", Icon: Users },
  { href: "/catalogue", label: "Catalogue", short: "Cat.", Icon: BookOpen },
  { href: "/assistant", label: "Assistant IA", short: "IA", Icon: Zap },
  { href: "/facturation", label: "Facturation", short: "Fact.", Icon: Euro },
  { href: "/parametres", label: "Paramètres", short: "Régl.", Icon: Settings },
];

function MobileNavLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cx(
        "touch-target flex flex-1 flex-col items-center justify-center gap-0 px-0.5 text-[10px] font-semibold leading-none sm:text-xs",
        active ? "text-[var(--primary)]" : "text-gray-600 dark:text-gray-400",
        focusRing,
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
      <span className="mt-0.5 max-w-full truncate">{label}</span>
    </Link>
  );
}

function DesktopChrome({
  children,
  prenom,
  email,
  defaultSidebarOpen,
}: {
  children: ReactNode;
  prenom?: string | null;
  email?: string | null;
  defaultSidebarOpen: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <PlombiAppSidebar prenom={prenom} email={email} />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-white dark:bg-gray-950">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <div className="mr-2 hidden h-4 w-px shrink-0 bg-gray-200 sm:block dark:bg-gray-800" />
          <div className="min-w-0 flex-1">
            <AppBreadcrumbs />
          </div>
          {prenom ? (
            <span className="hidden shrink-0 truncate text-sm text-gray-600 lg:inline dark:text-gray-400">{prenom}</span>
          ) : null}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}

function MobileChrome({
  children,
  prenom,
  email,
}: {
  children: ReactNode;
  prenom?: string | null;
  email?: string | null;
}) {
  const initial = (prenom?.trim()?.charAt(0) || email?.trim()?.charAt(0) || "?").toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-sm">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <Link
          href="/accueil"
          aria-label={`${APP_NAME} — accueil`}
          className={cx(
            "relative block size-10 shrink-0 overflow-hidden rounded-sm text-chart-1 outline-offset-2",
            "bg-transparent",
            focusRing,
          )}
        >
          {/* PNG 500×500 avec beaucoup de marge transparente : image agrandie + masque = picto lisible, sans fond ni cadre sur la barre bleue. */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Image
              src={APP_LOGO_MARK_SRC}
              alt=""
              width={500}
              height={500}
              sizes="40px"
              className="max-h-none max-w-none object-contain [height:310%] [width:310%]"
              priority
            />
          </span>
        </Link>
        <div className="flex min-w-0 items-center justify-center">
          <Link
            href="/parametres"
            className={cx(
              "touch-target inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white/95 hover:bg-white/10",
              focusRing,
            )}
          >
            <HelpCircle className="size-3.5 shrink-0 opacity-95" aria-hidden />
            Support
          </Link>
        </div>
        <div className="flex items-center justify-end">
          <Link
            href="/parametres"
            aria-label="Profil et réglages"
            className={cx(
              "flex size-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-sm font-semibold text-white hover:bg-white/25",
              focusRing,
            )}
          >
            {initial}
          </Link>
        </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto overflow-x-hidden p-3 pb-20 md:p-6 md:pb-6">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-gray-200 bg-white pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 shadow-[0_-1px_10px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-950">
        {NAV.map((item) => (
          <MobileNavLink key={item.href} href={item.href} label={item.short} Icon={item.Icon} />
        ))}
      </nav>
    </div>
  );
}

export function PlannerAppShell({
  children,
  prenom,
  email,
  defaultSidebarOpen,
}: {
  children: ReactNode;
  prenom?: string | null;
  email?: string | null;
  defaultSidebarOpen: boolean;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileChrome prenom={prenom} email={email}>
        {children}
      </MobileChrome>
    );
  }

  return (
    <DesktopChrome prenom={prenom} email={email} defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </DesktopChrome>
  );
}
