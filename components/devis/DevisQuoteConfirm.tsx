"use client";

import type { ReactNode } from "react";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { summarizeTva } from "@/lib/devis/tva-breakdown";
import { formatCurrencyEUR } from "@/lib/format";
import { cx, focusRing } from "@/lib/utils";

export type QuoteConfirmLine = {
  designation: string;
  quantite: number;
  unite: string;
  prix: string;
  source: string;
  /** Null tant que l'artisan n'a pas choisi. Jamais déduit du libellé. */
  tva?: TvaRateChoice | null;
};

export const TVA_RATES = [20, 10, 5.5] as const;
export type TvaRateChoice = (typeof TVA_RATES)[number];

function parsePrix(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function QuoteTvaSelector({
  tva,
  onTva,
  tvaMentioned = false,
  legend = "Choisis ton taux de TVA",
}: {
  tva: TvaRateChoice | null;
  onTva?: (tva: TvaRateChoice) => void;
  tvaMentioned?: boolean;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">{legend}</legend>
      <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-300">
        {tvaMentioned && tva != null
          ? `Tu as indiqué ${String(tva).replace(".", ",")} %. Tu peux changer avant de générer.`
          : "Aucun taux n'a été compris dans ta description. 20 %, 10 % ou 5,5 % selon le chantier."}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Taux de TVA">
        {TVA_RATES.map((rate) => {
          const selected = tva === rate;
          return (
            <button
              key={rate}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onTva?.(rate)}
              className={cx(
                focusRing,
                "min-h-11 rounded-xl border text-sm font-semibold",
                selected
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              )}
            >
              {String(rate).replace(".", ",")} %
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function quoteConfirmReady(
  lines: QuoteConfirmLine[],
  tva: TvaRateChoice | null,
  options?: { requireTva?: boolean },
): boolean {
  const pricesReady = lines.length > 0 && lines.every((line) => line.designation.trim().length > 0 && parsePrix(line.prix) != null);
  if (!(options?.requireTva ?? true)) return pricesReady;
  const perLine = lines.every((line) => line.tva != null);
  if (lines.some((line) => line.tva !== undefined)) return pricesReady && perLine;
  return pricesReady && tva != null;
}

type Props = {
  lines: QuoteConfirmLine[];
  onChange: (lines: QuoteConfirmLine[]) => void;
  tva?: TvaRateChoice | null;
  onTva?: (tva: TvaRateChoice) => void;
  tvaMentioned?: boolean;
  /** false sur la démo publique : pas de sélecteur, le taux se choisit dans l'app. */
  showTvaSelector?: boolean;
  requireTva?: boolean;
  uncertain?: boolean;
  messages?: string[];
  busy?: boolean;
  title?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  footer?: ReactNode;
  onLineEdit?: (index: number, field: "designation" | "prix") => void;
};

export function DevisQuoteConfirm({
  lines,
  onChange,
  tva = null,
  tvaMentioned = false,
  showTvaSelector = true,
  requireTva = true,
  uncertain = false,
  messages = [],
  busy = false,
  title = "J'ai compris ça, corrige si besoin avant de générer",
  onSubmit,
  submitLabel = "Générer le devis",
  footer,
  onLineEdit,
}: Props) {
  const [openTvaIndex, setOpenTvaIndex] = useState<number | null>(null);
  const parsed = lines.map((line) => parsePrix(line.prix));
  const complete = parsed.every((prix) => prix != null);
  const totalHt = complete
    ? Math.round(
        lines.reduce((sum, line, index) => sum + (parsed[index] ?? 0) * (line.quantite || 1), 0) * 100,
      ) / 100
    : null;
  const summary = !complete
    ? { kind: "incomplete" as const, totalHt: 0 }
    : summarizeTva(
        lines.map((line, index) => ({
          ht: Math.round((parsed[index] ?? 0) * (line.quantite || 1) * 100) / 100,
          rate: line.tva ?? null,
        })),
      );
  const uniformRate = lines.every((line) => line.tva != null && line.tva === lines[0]?.tva) ? lines[0]?.tva ?? null : null;
  const distinctRates = new Set(lines.map((line) => line.tva).filter((rate) => rate != null));
  const mixedRates = distinctRates.size > 1;
  const totalTtc = summary.kind === "incomplete" ? null : summary.totalTtc;

  function patch(index: number, partial: Partial<QuoteConfirmLine>, field: "designation" | "prix") {
    onLineEdit?.(index, field);
    onChange(lines.map((line, i) => (i === index ? { ...line, ...partial } : line)));
  }

  const ready = quoteConfirmReady(lines, tva, { requireTva: showTvaSelector && requireTva });
  const showTtc = showTvaSelector || tva != null;

  return (
    <div className="mt-5 space-y-4 rounded-2xl border border-blue-200 bg-[#EFF6FF] p-4 text-left dark:border-blue-900/50 dark:bg-blue-950/30">
      <div>
        <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">
          {uncertain
            ? "Les prix n'étaient pas assez sûrs pour afficher un devis. Vérifie chaque ligne."
            : "Rien n'est envoyé tant que tu n'as pas validé."}
        </p>
      </div>

      {messages.length > 0 ? (
        <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={`${line.source}-${index}`} className="rounded-xl bg-white p-3 dark:bg-slate-950">
            <label className="block text-xs font-medium text-slate-500" htmlFor={`confirm-designation-${index}`}>
              Prestation
            </label>
            <input
              id={`confirm-designation-${index}`}
              value={line.designation}
              onChange={(event) => patch(index, { designation: event.target.value }, "designation")}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900"
            />
            <label className="mt-2 block text-xs font-medium text-slate-500" htmlFor={`confirm-prix-${index}`}>
              Prix unitaire HT {line.quantite !== 1 ? `· qté ${line.quantite} ${line.unite}` : ""}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id={`confirm-prix-${index}`}
                inputMode="decimal"
                value={line.prix}
                placeholder="Prix HT"
                onChange={(event) => patch(index, { prix: event.target.value }, "prix")}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base tabular-nums dark:border-slate-700 dark:bg-slate-900"
              />
              {showTvaSelector ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    aria-expanded={openTvaIndex === index}
                    aria-label={line.tva == null ? "Choisir le taux de TVA" : `TVA ${String(line.tva).replace(".", ",")} %`}
                    onClick={() => setOpenTvaIndex(openTvaIndex === index ? null : index)}
                    className={cx(
                      focusRing,
                      "min-h-11 min-w-16 rounded-lg px-2 text-sm font-medium tabular-nums",
                      line.tva == null ? "text-slate-400" : "text-slate-700 dark:text-slate-200",
                    )}
                  >
                    {line.tva == null ? "TVA ?" : `${String(line.tva).replace(".", ",")} %`}
                  </button>
                  {openTvaIndex === index ? (
                    <div className="absolute right-0 z-10 mt-1 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      {TVA_RATES.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            trackFunnelEvent("quote_line_tva_changed", {
                              properties: { line_index: index, old_value: line.tva ?? null, new_value: rate },
                            });
                            onChange(lines.map((item, i) => (i === index ? { ...item, tva: rate } : item)));
                            setOpenTvaIndex(null);
                          }}
                          className={cx(
                            focusRing,
                            "min-h-11 w-full rounded-lg text-sm font-semibold",
                            line.tva === rate ? "bg-[#2563EB] text-white" : "text-slate-800 dark:text-slate-100",
                          )}
                        >
                          {String(rate).replace(".", ",")} %
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {showTvaSelector ? (
        <div>
          <QuoteTvaSelector
            tva={uniformRate ?? null}
            onTva={(rate) => onChange(lines.map((line) => ({ ...line, tva: rate })))}
            tvaMentioned={tvaMentioned && !mixedRates}
            legend="Appliquer un taux à toutes les lignes"
          />
          {mixedRates ? <p className="mt-2 text-xs text-slate-500">Taux multiples sur ce devis</p> : null}
        </div>
      ) : null}

      <div className="space-y-1 text-sm">
        <p className="font-medium text-slate-800 dark:text-slate-100">
          Total HT : {totalHt == null ? "—" : formatCurrencyEUR(totalHt)}
        </p>
        {summary.kind === "mixed" ? (
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {summary.rows.map((row) => (
              <p key={row.rate} className="flex justify-between gap-3 tabular-nums">
                <span>
                  Base {String(row.rate).replace(".", ",")} % {formatCurrencyEUR(row.base)}
                </span>
                <span>TVA {formatCurrencyEUR(row.tva)}</span>
              </p>
            ))}
          </div>
        ) : null}
        {showTtc ? (
          <>
            <p className={totalTtc == null ? "text-slate-400" : "text-slate-700 dark:text-slate-200"}>
              Total TVA : {summary.kind === "incomplete" ? "—" : formatCurrencyEUR(summary.totalTva)}
            </p>
            <p className={cx("font-semibold", totalTtc == null ? "text-slate-400" : "text-slate-900 dark:text-slate-50")}>
              Total TTC : {totalTtc == null ? "—" : formatCurrencyEUR(totalTtc)}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">TVA à choisir à la création du devis (20 %, 10 % ou 5,5 %)</p>
        )}
      </div>

      {footer ?? (
      <Button
        type="button"
        disabled={!ready || busy}
        isLoading={busy}
        loadingText="Génération…"
        onClick={onSubmit}
        className="h-12 w-full rounded-full !border-transparent !bg-[#2563EB] text-sm font-semibold !text-white"
      >
        {submitLabel}
      </Button>
      )}
    </div>
  );
}
