import type { ReactNode } from "react";

export function CompteSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </section>
  );
}
