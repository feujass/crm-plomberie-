"use client";

import { HelpCircle, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { AppNavLink } from "@/components/layout/AppNavLink";
import { PlombiAppSidebar } from "@/components/layout/PlombiAppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/planner/Sidebar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NAV_MOBILE, type NavItem } from "@/lib/app-nav";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import { useScrollHideHeader } from "@/lib/use-scroll-hide-header";
import { useIsMobile } from "@/lib/useMobile";
import { cx, focusRing } from "@/lib/utils";
import type { BackendProfile } from "@/types/backend";
import { FLOWO_DESKTOP_CONTENT_CLASS } from "@/lib/flowo-ui";

import { AppBreadcrumbs } from "./AppBreadcrumbs";
import { LoggedInAnalytics } from "@/components/legal/LoggedInAnalytics";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

function MobileNavLink({
  href,
  label,
  title,
  Icon,
  alsoMatch,
}: {
  href: string;
  label: string;
  title?: string;
  Icon: NavItem["Icon"];
  alsoMatch?: string[];
}) {
  return (
    <AppNavLink
      href={href}
      alsoMatch={alsoMatch}
      ariaLabel={title ?? label}
      title={title ?? label}
      linkClassName="flex min-w-0 flex-1 items-end justify-center"
      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 px-0.5 py-1 text-[10px] font-medium leading-none tracking-tight [&[data-active=true]_svg]:fill-current"
      activeClassName="text-[color:var(--primary)]"
      idleClassName="text-slate-500"
    >
      <Icon className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="max-w-[3.25rem] truncate text-center">{label}</span>
    </AppNavLink>
  );
}

function MobileCreateNavLink({
  href,
  label,
  title,
  alsoMatch,
}: {
  href: string;
  label: string;
  title?: string;
  alsoMatch?: string[];
}) {
  return (
    <AppNavLink
      href={href}
      alsoMatch={alsoMatch}
      ariaLabel={title ?? label}
      title={title ?? label}
      linkClassName="relative flex min-w-0 flex-1 items-end justify-center"
      className="flex flex-col items-center justify-end gap-0.5 px-0.5 pt-0 text-[10px] font-medium leading-none tracking-tight"
      activeClassName="text-[color:var(--primary)]"
      idleClassName="text-slate-500"
    >
      <span className="-mt-5 mb-0.5 flex size-14 items-center justify-center rounded-full bg-[color:var(--primary)] text-white shadow-[0_6px_16px_rgba(37,99,235,0.35)] ring-4 ring-white">
        <Plus className="size-7" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="max-w-[3.25rem] truncate text-center">{label}</span>
    </AppNavLink>
  );
}

function MobileProfileNavLink({
  href,
  label,
  title,
  prenom,
  nom,
  email,
  avatarUrl,
}: {
  href: string;
  label: string;
  title?: string;
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  return (
    <AppNavLink
      href={href}
      ariaLabel={title ?? label}
      title={title ?? label}
      linkClassName="flex min-w-0 flex-1 items-end justify-center"
      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 px-0.5 py-1 text-[10px] font-medium leading-none tracking-tight [&[data-active=true]_span]:ring-2 [&[data-active=true]_span]:ring-[color:var(--primary)]"
      activeClassName="text-[color:var(--primary)]"
      idleClassName="text-slate-500"
    >
      <UserAvatar
        avatarUrl={avatarUrl}
        prenom={prenom}
        nom={nom}
        email={email}
        size="sm"
        initialsMax={1}
        className="size-6 text-[10px]"
      />
      <span className="max-w-[3.25rem] truncate text-center">{label}</span>
    </AppNavLink>
  );
}

function DesktopChrome({
  children,
  prenom,
  nom,
  email,
  profile,
  defaultSidebarOpen,
}: {
  children: ReactNode;
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  profile?: BackendProfile;
  defaultSidebarOpen: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <PlombiAppSidebar prenom={prenom} nom={nom} email={email} profile={profile} />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-50/90 via-[var(--background)] to-blue-50/35 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md md:px-6 dark:border-gray-800 dark:bg-gray-950/90">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <div className="mr-1 hidden h-4 w-px shrink-0 bg-slate-200 sm:block dark:bg-gray-800" />
          <div className="min-w-0 flex-1">
            <AppBreadcrumbs />
          </div>
          {prenom ? (
            <span className="hidden shrink-0 truncate text-sm font-medium text-slate-600 lg:inline dark:text-gray-400">
              Bonjour, {prenom}
            </span>
          ) : null}
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 md:px-6 md:py-8">
          <div className={FLOWO_DESKTOP_CONTENT_CLASS}>{children}</div>
          <footer className={cx("mt-10 border-t border-slate-200/80 pt-5 dark:border-gray-800", FLOWO_DESKTOP_CONTENT_CLASS)}>
            <LegalFooterLinks className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-gray-400" />
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}

function MobileChrome({
  children,
  prenom,
  nom,
  email,
  profile,
}: {
  children: ReactNode;
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  profile?: BackendProfile;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const headerVisible = useScrollHideHeader({ scrollRoot: mainRef });
  const navItems = NAV_MOBILE;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  const headerHeight = "calc(2.75rem + env(safe-area-inset-top))";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--background)]">
      <div
        className={cx(
          "shrink-0 overflow-hidden bg-[color:var(--primary)] text-white shadow-sm transition-[height] duration-300 ease-out",
          headerVisible ? "border-b border-[color:var(--primary)]" : "border-b border-transparent",
        )}
        style={{ height: headerVisible ? headerHeight : 0 }}
      >
        <div
          className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-1.5 pt-[max(0.25rem,env(safe-area-inset-top))]"
          style={{ height: headerHeight }}
        >
          <Link
            href="/accueil"
            aria-label={`${APP_NAME} — accueil`}
            className={cx("shrink-0 text-lg font-bold leading-none tracking-tight text-white", focusRing)}
          >
            {APP_NAME}
          </Link>
          <div className="flex min-w-0 items-center justify-center">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Support Flowo")}`}
              className={cx(
                "inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-white/30 bg-black/10 px-2.5 py-1 text-xs font-medium leading-none text-white/95 hover:bg-white/10",
                focusRing,
              )}
            >
              <HelpCircle className="size-3.5 shrink-0" aria-hidden />
              Support
            </a>
          </div>
          <div className="flex items-center justify-end">
            <Link
              href="/compte"
              aria-label="Mon compte"
              className={cx("inline-flex shrink-0 rounded-full hover:opacity-90", focusRing)}
            >
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                prenom={prenom}
                nom={nom}
                email={email}
                size="sm"
                variant="header"
                initialsMax={1}
              />
            </Link>
          </div>
        </div>
      </div>
      <main
        ref={mainRef}
        className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 pb-8 [-webkit-overflow-scrolling:touch]"
      >
        {children}
      </main>
      <nav
        className="relative z-10 flex shrink-0 items-end overflow-visible border-t border-slate-200/80 bg-white px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
        aria-label="Navigation principale"
      >
        {navItems.map((item) => {
          if (item.emphasis === "create") {
            return (
              <MobileCreateNavLink
                key={item.href}
                href={item.href}
                label={item.short ?? item.label}
                title={item.label}
                alsoMatch={item.alsoMatch}
              />
            );
          }
          if (item.href === "/compte") {
            return (
              <MobileProfileNavLink
                key={item.href}
                href={item.href}
                label={item.short ?? item.label}
                title={item.label}
                prenom={prenom}
                nom={nom}
                email={email}
                avatarUrl={profile?.avatar_url}
              />
            );
          }
          return (
            <MobileNavLink
              key={item.href}
              href={item.href}
              label={item.short ?? item.label}
              title={item.label}
              Icon={item.Icon}
              alsoMatch={item.alsoMatch}
            />
          );
        })}
      </nav>
    </div>
  );
}

export function PlannerAppShell({
  children,
  userId,
  prenom,
  nom,
  email,
  profile,
  defaultSidebarOpen,
}: {
  children: ReactNode;
  userId?: string | null;
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  profile?: BackendProfile;
  defaultSidebarOpen: boolean;
}) {
  const isMobile = useIsMobile();
  const analytics = (
    <LoggedInAnalytics
      userId={userId}
      email={email}
      plan={profile?.subscription_plan ?? null}
      metier={profile?.metier ?? null}
    />
  );

  if (isMobile) {
    return (
      <MobileChrome prenom={prenom} nom={nom} email={email} profile={profile}>
        {analytics}
        {children}
      </MobileChrome>
    );
  }

  return (
    <DesktopChrome prenom={prenom} nom={nom} email={email} profile={profile} defaultSidebarOpen={defaultSidebarOpen}>
      {analytics}
      {children}
    </DesktopChrome>
  );
}
