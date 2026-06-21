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
import { cx, focusRing } from "@/lib/utils";

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
        "flex items-center gap-x-2.5 rounded-md p-2 text-base transition hover:bg-gray-200/50 sm:text-sm hover:dark:bg-gray-900",
        "text-gray-900 dark:text-gray-400 hover:dark:text-gray-50",
        "data-[active=true]:text-[var(--primary)] data-[active=true]:dark:text-[var(--primary)]",
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
  email,
}: {
  prenom?: string | null;
  email?: string | null;
}) {
  return (
    <Sidebar className="bg-white dark:bg-gray-925">
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
              {NAV_DESKTOP.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <NavLink href={item.href} label={item.label} Icon={item.Icon} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <PlombiUserProfile prenom={prenom} email={email} />
      </SidebarFooter>
    </Sidebar>
  );
}
