import type { ReactNode } from "react";

/** Cadre type « app dans le navigateur » pour les aperçus démo. */
export function MarketingPreviewFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <span className="size-2.5 rounded-full bg-red-400" aria-hidden />
        <span className="size-2.5 rounded-full bg-amber-400" aria-hidden />
        <span className="size-2.5 rounded-full bg-emerald-400" aria-hidden />
        <span className="ml-2 truncate text-sm text-slate-500 dark:text-slate-400">{title}</span>
        <span className="ml-auto rounded-full bg-[color:var(--primary)]/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--primary)]">
          Aperçu démo
        </span>
      </div>
      <div className="pointer-events-none select-none p-6 md:p-7">{children}</div>
    </div>
  );
}
