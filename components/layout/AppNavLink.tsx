"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cx, focusRing } from "@/lib/utils";

function NavPendingMark({
  href,
  children,
  className,
  activeClassName,
  idleClassName,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  idleClassName?: string;
}) {
  const { pending } = useLinkStatus();
  const pathname = usePathname();
  const matched = pathname === href || pathname.startsWith(`${href}/`);
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
  ariaLabel,
  title,
  linkClassName,
  className,
  activeClassName,
  idleClassName,
  children,
}: {
  href: string;
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
        className={className}
        activeClassName={activeClassName}
        idleClassName={idleClassName}
      >
        {children}
      </NavPendingMark>
    </Link>
  );
}
