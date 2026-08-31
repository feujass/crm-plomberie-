import { DEMO_CHART } from "@/components/marketing/marketing-data";

const BAR_MAX_PX = 96;

export function MarketingDemoChart() {
  const max = Math.max(...DEMO_CHART.map((c) => c.ca));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">CA mensuel</p>
      <p className="mb-3 text-xs text-slate-500">Devis acceptés, 6 derniers mois</p>
      <div className="flex items-end justify-between gap-1.5 md:gap-2">
        {DEMO_CHART.map((c) => {
          const barPx = Math.max(14, Math.round((c.ca / max) * BAR_MAX_PX));
          return (
            <div key={c.mois} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 md:text-xs">
                {Math.round(c.ca / 1000)}k
              </span>
              <div
                className="w-full max-w-[2.25rem] rounded-t-md bg-[color:var(--primary)] shadow-sm"
                style={{ height: `${barPx}px` }}
              />
              <span className="text-[10px] font-medium text-slate-500 md:text-xs">{c.mois}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
