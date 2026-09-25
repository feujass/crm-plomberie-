import { CircleBackLink } from "@/components/ui/CircleBackLink";
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
    <div className="mx-auto w-full max-w-lg space-y-5 pb-10 lg:max-w-2xl">
      <CircleBackLink href="/compte" />
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
