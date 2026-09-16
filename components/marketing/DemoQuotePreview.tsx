import { computeDemoTotals, demoLineTotalHt, type DemoPreviewLine } from "@/lib/demo/quote-math";
import { formatCurrencyEUR } from "@/lib/format";

type Props = {
  lines: DemoPreviewLine[];
  lineCount: number;
  totalTtc: number;
};

function asPreviewLine(raw: {
  designation: string;
  quantite: number;
  unite: string;
  prix_ht?: number;
  tva?: number;
}): DemoPreviewLine {
  return {
    designation: raw.designation,
    quantite: raw.quantite,
    unite: raw.unite,
    prix_ht: Number(raw.prix_ht) || 0,
    tva: Number(raw.tva) || 0,
  };
}

export function DemoQuotePreview({ lines, lineCount, totalTtc }: Props) {
  const normalized = lines.map(asPreviewLine);
  const totals = computeDemoTotals(normalized);
  const ttc = totals.total_ttc || totalTtc;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Votre entreprise</p>
          <p className="text-xs text-slate-500">À compléter à la création du compte</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--primary)]">Devis</p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Aperçu</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 px-4 py-1 dark:divide-slate-800 sm:hidden">
        {normalized.map((l, idx) => (
          <div key={`${l.designation}-${idx}`} className="py-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{l.designation}</p>
            <p className="mt-1 text-xs text-slate-500">
              {l.quantite} {l.unite} × {formatCurrencyEUR(l.prix_ht)} HT
            </p>
            <div className="mt-1 flex items-baseline justify-end gap-2">
              <span className="text-sm font-semibold tabular-nums">{formatCurrencyEUR(demoLineTotalHt(l))}</span>
              <span className="text-[11px] tabular-nums text-slate-500">{l.tva} %</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden px-4 pt-2 sm:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <th className="py-2 pr-2 font-semibold">Désignation</th>
              <th className="py-2 px-1 text-right font-semibold">Qté</th>
              <th className="py-2 px-1 font-semibold">Unité</th>
              <th className="py-2 px-1 text-right font-semibold">PU HT</th>
              <th className="py-2 px-1 text-right font-semibold">TVA</th>
              <th className="py-2 pl-1 text-right font-semibold">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {normalized.map((l, idx) => (
              <tr key={`${l.designation}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-2 align-top text-slate-900 dark:text-slate-100">{l.designation}</td>
                <td className="py-2 px-1 text-right tabular-nums">{l.quantite}</td>
                <td className="py-2 px-1">{l.unite}</td>
                <td className="py-2 px-1 text-right tabular-nums">{formatCurrencyEUR(l.prix_ht)}</td>
                <td className="py-2 px-1 text-right tabular-nums">{l.tva} %</td>
                <td className="py-2 pl-1 text-right tabular-nums font-medium">
                  {formatCurrencyEUR(demoLineTotalHt(l))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-0.5 px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
        <p>Total HT : {formatCurrencyEUR(totals.total_ht)}</p>
        <p>Total TVA : {formatCurrencyEUR(totals.total_tva)}</p>
        <p className="text-base font-bold text-slate-900 dark:text-slate-50">Total TTC : {formatCurrencyEUR(ttc)}</p>
        <p className="text-[11px] font-normal text-slate-400">{lineCount} ligne{lineCount > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
