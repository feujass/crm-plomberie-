"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cx, focusRing } from "@/lib/utils";

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavPendingMark({
  href,
  alsoMatch,
  children,
  className,
  activeClassName,
  idleClassName,
}: {
  href: string;
  alsoMatch?: string[];
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  idleClassName?: string;
}) {
  const { pending } = useLinkStatus();
  const pathname = usePathname();
  const matched =
    pathMatches(pathname, href) || (alsoMatch?.some((prefix) => pathMatches(pathname, prefix)) ?? false);
  const active = pending || matched;
  return (
    <span
      className={cx("transition-colors duration-150", className, active ? activeClassName : idleClassName)}
      data-active={active ? "true" : undefined}
      aria-current={active && !pending ? "page" : undefined}
    >
      {children}
    </span>
  );
}

export function AppNavLink({
  href,
  alsoMatch,
  ariaLabel,
  title,
  linkClassName,
  className,
  activeClassName,
  idleClassName,
  children,
}: {
  href: string;
  alsoMatch?: string[];
  ariaLabel?: string;
  title?: string;
  linkClassName?: string;
  className?: string;
  activeClassName?: string;
  idleClassName?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch aria-label={ariaLabel} title={title} className={cx(focusRing, linkClassName)}>
      <NavPendingMark
        href={href}
        alsoMatch={alsoMatch}
        className={className}
        activeClassName={activeClassName}
        idleClassName={idleClassName}
      >
        {children}
      </NavPendingMark>
    </Link>
  );
}
