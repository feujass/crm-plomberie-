"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Mic, Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { MarketingDemoChart } from "@/components/marketing/MarketingDemoChart";
import { MarketingPreviewFrame } from "@/components/marketing/MarketingPreviewFrame";
import {
  DEMO_DEVIS_LIST,
  DEMO_ENTREPRISE,
  DEMO_KPIS,
  DEMO_LIGNES,
  DEMO_TOTALS,
  DEMO_TRANSCRIPT,
} from "@/components/marketing/marketing-data";
import { cx } from "@/lib/utils";

const SLIDES = [
  { id: "accueil", label: "Tableau de bord", hint: "CA, devis et relances en un coup d'œil" },
  { id: "vocal", label: "Devis vocal", hint: "Dictez le chantier, Zeus rédige les lignes" },
  { id: "edition", label: "Édition & envoi", hint: "Relisez, ajustez, envoyez en un clic" },
  { id: "client", label: "Vue client", hint: "Le devis professionnel reçu par e-mail" },
] as const;

type SlideId = (typeof SLIDES)[number]["id"];

const SWIPE_THRESHOLD = 48;

function StatutBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    envoye: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
    accepte: "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    brouillon: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400",
  };
  const labels: Record<string, string> = {
    envoye: "Envoyé",
    accepte: "Accepté",
    brouillon: "Brouillon",
  };
  return (
    <span
      className={cx(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[statut] ?? styles.brouillon,
      )}
    >
      {labels[statut] ?? statut}
    </span>
  );
}

function DevisTable({ compact }: { compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[520px] text-left text-xs md:text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2.5 font-medium">Désignation</th>
            <th className="px-2 py-2.5 text-right font-medium">Qté</th>
            <th className="px-2 py-2.5 font-medium">Unité</th>
            <th className="px-2 py-2.5 text-right font-medium">PU HT</th>
            {!compact && <th className="px-2 py-2.5 text-right font-medium">TVA</th>}
            <th className="px-3 py-2.5 text-right font-medium">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_LIGNES.map((l) => (
            <tr key={l.designation} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-3 leading-snug">{l.designation}</td>
              <td className="px-2 py-3 text-right tabular-nums">{l.qte}</td>
              <td className="px-2 py-3 text-slate-600 dark:text-slate-400">{l.unite}</td>
              <td className="px-2 py-3 text-right tabular-nums">{l.pu_ht}</td>
              {!compact && <td className="px-2 py-3 text-right tabular-nums">{l.tva}</td>}
              <td className="px-3 py-3 text-right font-medium tabular-nums">{l.total_ht}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DevisTotals() {
  return (
    <div className="space-y-1 border-t border-slate-200 pt-4 text-right text-sm dark:border-slate-700">
      <p className="text-slate-600 dark:text-slate-400">Total HT : {DEMO_TOTALS.total_ht}</p>
      <p className="text-slate-600 dark:text-slate-400">Total TVA : {DEMO_TOTALS.total_tva}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Total TTC : {DEMO_TOTALS.total_ttc}</p>
    </div>
  );
}

function MockAccueil() {
  return (
    <MarketingPreviewFrame title="flowo.app/accueil">
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-[color:var(--primary)]/15 bg-[var(--card)] p-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-[color:var(--primary)]/20">
            <Image
              src="/zeus-avatar.png"
              alt=""
              width={128}
              height={128}
              className="h-full w-full object-cover object-[center_18%]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Bonjour Julien 👋</p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Prêt pour un devis vocal ?</p>
            <div className="mt-2 rounded-lg bg-[color:var(--primary)] py-2 text-center text-sm font-semibold text-white">
              Créer un devis vocal
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEMO_KPIS.map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>

        <MarketingDemoChart />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Derniers devis</p>
          {DEMO_DEVIS_LIST.map((d) => (
            <div
              key={d.numero}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <span className="font-semibold text-[color:var(--primary)]">{d.numero}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-400">{d.client}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatutBadge statut={d.statut} />
                <span className="font-semibold tabular-nums">{d.montant}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MarketingPreviewFrame>
  );
}

function MockVocal() {
  return (
    <MarketingPreviewFrame title="flowo.app/devis/nouveau">
      <div className="space-y-5">
        <p className="text-center text-base font-bold md:text-lg">
          Zeus crée votre devis <span className="text-[color:var(--primary)]">à la voix</span>
        </p>
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[color:var(--primary)]/35 bg-[color:var(--primary)]/5 p-8">
          <span className="flex size-20 items-center justify-center rounded-full bg-[color:var(--primary)] text-white shadow-lg">
            <Mic className="size-10" aria-hidden />
          </span>
          <p className="text-base font-semibold text-[color:var(--primary)]">Enregistrement…</p>
          <div className="flex h-10 items-end gap-1">
            {[4, 7, 11, 6, 9, 12, 8, 10, 5, 9, 4, 8].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-[color:var(--primary)]"
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-100 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-300 md:text-base">
          {DEMO_TRANSCRIPT}
        </div>
        <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          5 lignes générées en 28 secondes
        </p>
      </div>
    </MarketingPreviewFrame>
  );
}

function MockEdition() {
  return (
    <MarketingPreviewFrame title="flowo.app/devis/DV-2026-042">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Devis</p>
            <p className="text-xl font-bold">DV-2026-042</p>
          </div>
          <StatutBadge statut="brouillon" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">Client : M. Martin</p>
        <DevisTable />
        <DevisTotals />
        <div className="flex items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] py-3.5 text-sm font-semibold text-white md:text-base">
          <Send className="size-5" aria-hidden />
          Envoyer le devis
        </div>
      </div>
    </MarketingPreviewFrame>
  );
}

function MockClient() {
  return (
    <MarketingPreviewFrame title="flowo.app/devis/public/…">
      <div className="space-y-5">
        <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
          <p className="text-base font-bold text-[color:var(--primary)]">{DEMO_ENTREPRISE.nom}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            SIRET {DEMO_ENTREPRISE.siret} · {DEMO_ENTREPRISE.ville}
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold">Devis DV-2026-042</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p>Client : M. Martin</p>
            <p>Date : 24 mai 2026 · Validité : 30 jours</p>
          </div>
          <div className="mt-3">
            <StatutBadge statut="envoye" />
          </div>
        </div>

        <DevisTable />
        <DevisTotals />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Conditions</p>
          <p className="mt-1">Acompte 30 % à la commande. Solde à réception des travaux. Devis valable 30 jours.</p>
        </div>
      </div>
    </MarketingPreviewFrame>
  );
}

const PREVIEWS: Record<SlideId, () => React.ReactNode> = {
  accueil: MockAccueil,
  vocal: MockVocal,
  edition: MockEdition,
  client: MockClient,
};

export function MarketingPreviewCarousel() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = SLIDES[index];
  const Preview = PREVIEWS[slide.id];

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      go(delta > 0 ? -1 : 1);
    }
    touchStartX.current = null;
  }

  return (
    <div id="apercu" className="scroll-mt-24">
      <div className="mb-8 flex items-center justify-between gap-4 md:mb-10">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Écran précédent"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-lg font-bold">{slide.label}</p>
          <p className="mt-1.5 text-sm text-slate-500">{slide.hint}</p>
          <p className="mt-2 text-xs text-slate-400">
            {index + 1} / {SLIDES.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Écran suivant"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div
        className="touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Preview />
      </div>

      <div className="mt-8 flex justify-center gap-2.5 md:mt-10">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.label}
            onClick={() => setIndex(i)}
            className={cx(
              "h-2 rounded-full transition-all",
              i === index ? "w-7 bg-[color:var(--primary)]" : "w-2 bg-slate-300 dark:bg-slate-600",
            )}
          />
        ))}
      </div>
    </div>
  );
}
