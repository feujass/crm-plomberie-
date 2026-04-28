import { cx, focusRing } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function CompteSubLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <Link
        href="/compte"
        aria-label="Retour"
        className={cx(
          "inline-flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white",
          focusRing,
        )}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
