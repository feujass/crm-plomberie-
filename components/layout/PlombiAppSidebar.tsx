"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/planner/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/planner/Sidebar";
import { APP_NAME } from "@/lib/app-branding";
import { NAV_DESKTOP } from "@/lib/app-nav";
import { filterNavByPlan } from "@/lib/plans/features";
import { cx, focusRing } from "@/lib/utils";
import type { BackendProfile } from "@/types/backend";

import { PlombiUserProfile } from "./PlombiUserProfile";
import type { NavItem } from "@/lib/app-nav";

function NavLink({ href, label, Icon }: { href: string; label: string; Icon: NavItem["Icon"] }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active}
      className={cx(
        "flex items-center gap-x-2.5 rounded-lg px-2.5 py-2 text-base transition sm:text-sm",
        "text-slate-700 hover:bg-slate-100/80 dark:text-gray-400 dark:hover:bg-gray-900",
        "data-[active=true]:bg-[color:var(--primary)]/10 data-[active=true]:font-semibold data-[active=true]:text-[var(--primary)] data-[active=true]:shadow-[inset_3px_0_0_0_var(--primary)]",
        focusRing,
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

export function PlombiAppSidebar({
  prenom,
  nom,
  email,
  profile,
}: {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  profile?: BackendProfile;
}) {
  const navItems = filterNavByPlan(NAV_DESKTOP, profile);

  return (
    <Sidebar className="border-r border-slate-200/80 bg-white shadow-[1px_0_0_rgba(15,23,42,0.03)] dark:border-gray-800 dark:bg-gray-925">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-white p-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <Logo className="size-6 text-[var(--primary)]" />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{APP_NAME}</span>
            {prenom ? (
              <span className="block truncate text-xs text-gray-600 dark:text-gray-400">Bonjour {prenom}</span>
            ) : (
              <span className="block truncate text-xs text-gray-600 dark:text-gray-400">Espace connecté</span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <NavLink href={item.href} label={item.label} Icon={item.Icon} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <PlombiUserProfile
          prenom={prenom}
          nom={nom}
          email={email}
          avatarUrl={profile?.avatar_url}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
