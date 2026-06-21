"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PlombiAppSidebar } from "@/components/layout/PlombiAppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/planner/Sidebar";
import { NAV_MOBILE } from "@/lib/app-nav";
import { useIsMobile } from "@/lib/useMobile";
import { cx, focusRing } from "@/lib/utils";

import { APP_LOGO_MARK_SRC, APP_NAME } from "@/lib/app-branding";

import { AppBreadcrumbs } from "./AppBreadcrumbs";
import type { NavItem } from "@/lib/app-nav";

function MobileNavLink({ href, label, title, Icon }: { href: string; label: string; title?: string; Icon: NavItem["Icon"] }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-label={title ?? label}
      title={title ?? label}
      className={cx(
        "touch-target flex flex-1 flex-col items-center justify-center gap-0 px-0.5 text-[10px] font-semibold leading-none sm:text-xs",
        active ? "text-white" : "text-white/65",
        focusRing,
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
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
      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-[var(--background)] dark:bg-gray-950">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-gray-200/80 bg-[var(--background)] px-4 dark:border-gray-800 dark:bg-gray-950">
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
              href="/devis/nouveau?tab=voice"
              className={cx(
                "touch-target inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-white/30 bg-black/10 px-3 py-1.5 text-xs font-medium text-white/95 hover:bg-white/10",
                focusRing,
              )}
            >
              Nouveau devis
            </Link>
          </div>
          <div className="flex items-center justify-end">
            <Link
              href="/compte"
              aria-label="Mon compte"
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
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-white/15 bg-[color:var(--primary)] pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5 shadow-[0_-6px_24px_rgba(0,0,0,0.12)]">
        {NAV_MOBILE.map((item) => (
          <MobileNavLink key={item.href} href={item.href} label={item.short ?? item.label} title={item.label} Icon={item.Icon} />
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
