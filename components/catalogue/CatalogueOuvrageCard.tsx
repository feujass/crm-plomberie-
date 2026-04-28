import { formatCurrencyEUR } from "@/lib/format";
import { cx } from "@/lib/utils";
import type { BackendOuvrage } from "@/types/backend";
import { Hammer, Package, UserCog } from "lucide-react";

export type CatalogueOuvrageRow = Pick<BackendOuvrage, "nom" | "description" | "type" | "prix_ht" | "unite">;

function TypeIcon({ type }: { type?: string }) {
  const t = type ?? "";
  const cls =
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/15 text-[color:var(--primary)] dark:bg-[color:var(--primary)]/25 dark:text-[color:var(--chart-1)]";
  if (t === "main_oeuvre")
    return (
      <span className={cls} aria-hidden>
        <UserCog className="size-5" strokeWidth={1.75} />
      </span>
    );
  if (t === "fourniture")
    return (
      <span className={cls} aria-hidden>
        <Package className="size-5" strokeWidth={1.75} />
      </span>
    );
  return (
    <span className={cls} aria-hidden>
      <Hammer className="size-5" strokeWidth={1.75} />
    </span>
  );
}

export function CatalogueOuvrageCard({ row }: { row: CatalogueOuvrageRow }) {
  const prix = Number(row.prix_ht ?? 0);
  const u = row.unite?.trim() || "u";
  const desc = row.description?.trim();

  return (
    <article className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900">
      <div className="space-y-1">
        <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-slate-50">{row.nom}</h3>
        {desc ? <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p> : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-100/90 bg-slate-50/60 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/80">
        <p className="text-sm font-bold tabular-nums text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          {formatCurrencyEUR(prix)}
          <span className="font-semibold text-slate-600 dark:text-slate-400"> / {u}</span>
        </p>
        <TypeIcon type={row.type} />
      </div>
    </article>
  );
}

export function CatalogueOuvrageCardMuted({ row }: { row: CatalogueOuvrageRow }) {
  return (
    <div className={cx("opacity-[0.92]", "[&_article]:border-dashed [&_article]:bg-white dark:[&_article]:bg-slate-900/40")}>
      <CatalogueOuvrageCard row={row} />
    </div>
  );
}
