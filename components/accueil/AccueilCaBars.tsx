function formatMoisLabel(mois: string): string {
  if (/^\d{4}-\d{2}$/.test(mois)) {
    return new Date(`${mois}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "short" }).replace(/\.$/, "");
  }
  return mois;
}

export function AccueilCaBars({ monthly }: { monthly: { mois: string; ca: number }[] }) {
  if (!monthly.length) return null;

  const max = Math.max(...monthly.map((c) => c.ca), 1);

  return (
    <div className="h-full rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-4">
        <p className="text-base font-semibold text-slate-800">CA mensuel</p>
        <p className="text-sm text-slate-500">Devis acceptés, 6 derniers mois</p>
      </div>
      <div className="flex justify-between gap-2 md:gap-3">
        {monthly.map((c) => {
          const ratio = c.ca > 0 ? c.ca / max : 0;
          const barPct = c.ca > 0 ? Math.max(6, Math.round(ratio * 100)) : 6;
          const valueLabel = c.ca >= 1000 ? `${Math.round(c.ca / 1000)}k` : String(Math.round(c.ca));
          return (
            <div key={c.mois} className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-2 flex h-5 items-center text-xs font-semibold tabular-nums text-slate-600 sm:text-sm">
                {valueLabel}
              </span>
              <div className="flex h-28 w-full max-w-[3rem] flex-col justify-end lg:h-40" aria-hidden>
                <div
                  className="w-full rounded-t-md bg-[color:var(--primary)] shadow-sm transition-[height] duration-300 ease-out"
                  style={{ height: `${barPct}%` }}
                />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-500 sm:text-sm">{formatMoisLabel(c.mois)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
