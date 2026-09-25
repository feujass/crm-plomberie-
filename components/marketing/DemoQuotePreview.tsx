"use client";

import { useRef, useState } from "react";

import { demoLineTotalHt } from "@/lib/demo/quote-math";
import { formatCurrencyEUR } from "@/lib/format";

export type DemoEditableLine = {
  designation: string;
  quantite: number;
  unite: string;
  prix: string;
  tva?: number;
};

const TRANSCRIPT_LIMIT = 200;

const fieldClass =
  "min-h-11 w-full rounded-md border border-slate-200/80 bg-transparent px-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:bg-slate-900";

function parsePrix(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function demoPricesComplete(lines: DemoEditableLine[]): boolean {
  return lines.length > 0 && lines.every((line) => parsePrix(line.prix) != null);
}

export function demoTotalHt(lines: DemoEditableLine[]): number | null {
  if (!demoPricesComplete(lines)) return null;
  const total = lines.reduce((sum, line) => sum + (parsePrix(line.prix) ?? 0) * (line.quantite || 1), 0);
  return Math.round(total * 100) / 100;
}

type Props = {
  lines: DemoEditableLine[];
  onChange: (lines: DemoEditableLine[]) => void;
  onLineCommit?: (index: number, field: "designation" | "prix", previous: string, next: string) => void;
  /** Texte après correction de vocabulaire, celui envoyé au moteur. */
  transcript?: string | null;
  /** null : aucun taux dicté. undefined : ancien aperçu avec la TVA des lignes. */
  tvaRate?: number | null;
};

function TranscriptBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > TRANSCRIPT_LIMIT;
  const shown = long && !open ? `${text.slice(0, TRANSCRIPT_LIMIT).trimEnd()}…` : text;

  return (
    <p className="bg-slate-50 px-4 py-2.5 text-xs italic leading-relaxed text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
      Tu as dit : « {shown} »
      {long ? (
        <button
          type="button"
          className="ml-2 min-h-11 text-xs not-italic font-medium text-slate-600 underline dark:text-slate-300"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "réduire" : "voir tout"}
        </button>
      ) : null}
    </p>
  );
}

export function DemoQuotePreview({ lines, onChange, onLineCommit, transcript, tvaRate }: Props) {
  const focusRef = useRef<{ index: number; field: "designation" | "prix"; value: string } | null>(null);
  const totalHt = demoTotalHt(lines);
  const rate = typeof tvaRate === "number" ? tvaRate : null;
  const showTva = rate != null;
  const totalTva = totalHt != null && rate != null ? Math.round(totalHt * (rate / 100) * 100) / 100 : null;
  const totalTtc = totalHt != null && totalTva != null ? Math.round((totalHt + totalTva) * 100) / 100 : null;

  function patch(index: number, partial: Partial<DemoEditableLine>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...partial } : line)));
  }

  function remember(index: number, field: "designation" | "prix", value: string) {
    focusRef.current = { index, field, value };
  }

  function commit(index: number, field: "designation" | "prix", next: string) {
    const snap = focusRef.current;
    const previous = snap && snap.index === index && snap.field === field ? snap.value : next;
    if (previous === next) return;
    onLineCommit?.(index, field, previous, next);
  }

  function lineTva(line: DemoEditableLine): number {
    return rate ?? (Number(line.tva) || 0);
  }

  function lineTotal(line: DemoEditableLine): number | null {
    const prix = parsePrix(line.prix);
    if (prix == null) return null;
    return demoLineTotalHt({ quantite: line.quantite || 1, prix_ht: prix });
  }

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

      {transcript ? <TranscriptBlock text={transcript} /> : null}

      <div className="divide-y divide-slate-100 px-4 py-1 dark:divide-slate-800 sm:hidden">
        {lines.map((line, index) => {
          const total = lineTotal(line);
          return (
            <div key={index} className="py-3">
              <label className="sr-only" htmlFor={`demo-designation-m-${index}`}>
                Désignation
              </label>
              <input
                id={`demo-designation-m-${index}`}
                value={line.designation}
                onFocus={() => remember(index, "designation", line.designation)}
                onChange={(event) => patch(index, { designation: event.target.value })}
                onBlur={(event) => commit(index, "designation", event.target.value)}
                className={fieldClass}
              />
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span className="shrink-0">
                  {line.quantite} {line.unite} ×
                </span>
                <label className="sr-only" htmlFor={`demo-prix-m-${index}`}>
                  Prix unitaire HT
                </label>
                <input
                  id={`demo-prix-m-${index}`}
                  inputMode="decimal"
                  value={line.prix}
                  placeholder="Prix HT"
                  onFocus={() => remember(index, "prix", line.prix)}
                  onChange={(event) => patch(index, { prix: event.target.value })}
                  onBlur={(event) => commit(index, "prix", event.target.value)}
                  className={`${fieldClass} tabular-nums`}
                />
                <span className="shrink-0">HT</span>
              </div>
              <div className="mt-1 flex items-baseline justify-end gap-2">
                <span className="text-sm font-semibold tabular-nums">{total == null ? "—" : formatCurrencyEUR(total)}</span>
                {showTva ? <span className="text-[11px] tabular-nums text-slate-500">{lineTva(line)} %</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden px-4 pt-2 sm:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <th className="py-2 pr-2 font-semibold">Désignation</th>
              <th className="py-2 px-1 text-right font-semibold">Qté</th>
              <th className="py-2 px-1 font-semibold">Unité</th>
              <th className="py-2 px-1 text-right font-semibold">PU HT</th>
              {showTva ? <th className="py-2 px-1 text-right font-semibold">TVA</th> : null}
              <th className="py-2 pl-1 text-right font-semibold">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const total = lineTotal(line);
              return (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2 align-middle">
                    <label className="sr-only" htmlFor={`demo-designation-${index}`}>
                      Désignation
                    </label>
                    <input
                      id={`demo-designation-${index}`}
                      value={line.designation}
                      onFocus={() => remember(index, "designation", line.designation)}
                      onChange={(event) => patch(index, { designation: event.target.value })}
                      onBlur={(event) => commit(index, "designation", event.target.value)}
                      className={fieldClass}
                    />
                  </td>
                  <td className="py-2 px-1 text-right tabular-nums">{line.quantite}</td>
                  <td className="py-2 px-1">{line.unite}</td>
                  <td className="py-2 px-1 align-middle">
                    <label className="sr-only" htmlFor={`demo-prix-${index}`}>
                      Prix unitaire HT
                    </label>
                    <input
                      id={`demo-prix-${index}`}
                      inputMode="decimal"
                      value={line.prix}
                      placeholder="Prix HT"
                      onFocus={() => remember(index, "prix", line.prix)}
                      onChange={(event) => patch(index, { prix: event.target.value })}
                      onBlur={(event) => commit(index, "prix", event.target.value)}
                      className={`${fieldClass} text-right tabular-nums`}
                    />
                  </td>
                  {showTva ? <td className="py-2 px-1 text-right tabular-nums">{lineTva(line)} %</td> : null}
                  <td className="py-2 pl-1 text-right tabular-nums font-medium">
                    {total == null ? "—" : formatCurrencyEUR(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-0.5 px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
        <p className="text-base font-bold text-slate-900 dark:text-slate-50">
          Total HT : {totalHt == null ? "—" : formatCurrencyEUR(totalHt)}
        </p>
        <p className={totalTva == null ? "text-slate-400" : undefined}>
          Total TVA : {totalTva == null ? "—" : formatCurrencyEUR(totalTva)}
        </p>
        <p
          className={
            totalTtc == null
              ? "text-base font-bold text-slate-400"
              : "text-base font-bold text-slate-900 dark:text-slate-50"
          }
        >
          Total TTC : {totalTtc == null ? "—" : formatCurrencyEUR(totalTtc)}
        </p>
        <p className="text-[11px] font-normal text-slate-400">
          {lines.length} ligne{lines.length > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
