"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME } from "@/lib/app-branding";
import { useScrollHideHeader } from "@/lib/use-scroll-hide-header";
import { cx } from "@/lib/utils";

export function MarketingHeader() {
  const pathname = usePathname();
  const visible = useScrollHideHeader({ wheel: true });
  const isAffiliation = pathname === "/affiliation";
  const partnersHref = "/affiliation";

  return (
    <header
      className={cx(
        "sticky top-0 z-50 bg-[var(--background)] shadow-sm transition-transform duration-300 ease-out dark:bg-gray-950",
        !isAffiliation && "border-b border-slate-200 dark:border-slate-800",
        visible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6 lg:max-w-7xl lg:gap-6 lg:px-8 lg:py-4">
        <Link href="/" className="inline-flex items-center py-0.5 pl-0.5">
          <span className="text-xl font-bold tracking-tight lg:text-2xl">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
          <Link
            href={partnersHref}
            className={cx(
              "hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline lg:px-4 lg:text-[15px]",
              isAffiliation
                ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
                : "text-slate-600 dark:text-slate-300",
            )}
          >
            Partenaires
          </Link>
          {!isAffiliation ? (
            <Link
              href="/#tarifs"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 sm:inline dark:text-slate-300 lg:px-4 lg:text-[15px]"
            >
              Tarifs
            </Link>
          ) : null}
          {!isAffiliation ? (
            <Link
              href="/login"
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 sm:hidden dark:text-slate-400"
            >
              Connexion
            </Link>
          ) : null}
          {!isAffiliation ? (
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 sm:inline dark:text-slate-300 lg:px-4 lg:text-[15px]"
            >
              Connexion CRM
            </Link>
          ) : (
            <Link
              href="/partenaire/connexion"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 sm:inline dark:text-violet-300 lg:px-4 lg:text-[15px]"
            >
              Connexion partenaire
            </Link>
          )}
          {!isAffiliation ? (
            <Link
              href="/register"
              data-cta-location="header"
              className="hidden rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md sm:inline-flex md:px-5 lg:px-6 lg:py-3 lg:text-base"
            >
              Essayer gratuitement — sans CB
            </Link>
          ) : (
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm md:px-5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              Retour à {APP_NAME}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
