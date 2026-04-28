"use client";

import { formatCurrencyEUR } from "@/lib/format";
import { cx } from "@/lib/utils";

export function RentabiliteBloc({
  budget,
  heuresPrevues,
  heuresPassees,
}: {
  budget: number;
  heuresPrevues: number;
  heuresPassees: number;
}) {
  const planned = Math.max(heuresPrevues, 0);
  const spent = Math.max(0, heuresPassees);
  const ratio = planned <= 0 ? 0 : Math.min(spent / planned, 1.5);

  let tone: "ok" | "warn" | "danger" = "ok";
  let statusText = "";
  let statusClass = "text-[color:var(--muted-foreground)]";

  if (planned > 0) {
    if (spent < planned * 0.9) {
      tone = "ok";
      statusText = "Dans les clous";
      statusClass = "text-emerald-700 dark:text-emerald-300";
    } else if (spent <= planned) {
      tone = "warn";
      statusText = "Attention";
      statusClass = "text-amber-700 dark:text-amber-300";
    } else {
      tone = "danger";
      statusText = "Dépassement — chantier déficitaire";
      statusClass = "text-red-700 dark:text-red-300";
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-sm">Rentabilité (temps)</strong>
        <span className="text-xs text-[var(--muted-foreground)]">Budget : {formatCurrencyEUR(budget)}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--foreground)]">
        Heures prévues : <strong>{formatHeures(planned)}h</strong> · Heures passées : <strong>{formatHeures(spent)}h</strong>
      </p>

      {planned > 0 ? (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className={cx(
                "h-full rounded-full transition-[width] duration-300",
                tone === "ok" ? "bg-emerald-500" : "",
                tone === "warn" ? "bg-amber-500" : "",
                tone === "danger" ? "bg-red-500" : "",
              )}
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
          </div>
          <p className={cx("mt-2 text-sm font-semibold", statusClass)}>{statusText}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Indiquez des heures prévues pour activer la jauge de suivi.</p>
      )}
    </div>
  );
}

function formatHeures(n: number) {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
}

