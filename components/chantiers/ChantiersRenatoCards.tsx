"use client";

import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import { chantierNextActionDisplay } from "@/lib/chantier-next-action";
import {
  FLOWO_CARD_HERO_GRADIENT_CLASS,
  FLOWO_CARD_HERO_SURFACE_CLASS,
  FLOWO_EMPTY_LIST_CLASS,
  FLOWO_LIST_CARD_CLASS,
} from "@/lib/flowo-ui";
import { RENATO_HERO_CHANTIER } from "@/lib/renato-hero";
import { cx, focusRing } from "@/lib/utils";
import type { Chantier } from "@/types/chantiers";
import { Calendar, ChevronRight, MapPin, User, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type ChantierListSegment = "en_cours" | "termine";

function statusDot(status?: string | null) {
  const s = status ?? "";
  if (s === "Terminé") return "bg-emerald-500";
  if (s === "Urgent") return "bg-red-500";
  if (s === "En cours") return "bg-[color:var(--primary)]";
  return "bg-slate-500";
}

type Props = {
  chantiers: Chantier[];
  clientAddresses: Record<string, string>;
  /** Prénom + nom par client_id */
  clientNames: Record<string, string>;
  listSegment: ChantierListSegment;
};

export function ChantiersRenatoCards({ chantiers, clientAddresses, clientNames, listSegment }: Props) {
  const showChantierHero = listSegment === "termine";

  if (!chantiers.length) {
    return (
      <p className={FLOWO_EMPTY_LIST_CLASS}>
        Aucun chantier dans cette catégorie. Changez d&apos;onglet ou créez un chantier.
      </p>
    );
  }

  return (
    <>
      {/* Mobile : une ligne = un chantier — statut, échéance, prochaine action (sans budget en premier plan) */}
      <ul className="space-y-2 md:hidden">
        {chantiers.map((p) => {
          const cid = p.client_id ? String(p.client_id) : "";
          const clientLine = (cid && clientNames[cid]?.trim()) || "Client à définir";
          const addr =
            (p.site_address?.trim() ||
              (cid && clientAddresses[cid]?.trim()) ||
              "Adresse non renseignée") as string;
          const dot = statusDot(p.status);
          const badgeText = p.status?.trim() || "Chantier";
          const next = chantierNextActionDisplay(p);
          return (
            <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-[var(--card)] shadow-sm dark:border-slate-800">
              <Link
                href={`/chantiers/${p.id}`}
                className={cx("flex items-stretch gap-0", focusRing)}
              >
                <div className={cx("w-1 shrink-0", dot)} aria-hidden />
                <div className="min-w-0 flex-1 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-50">{p.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        <User className="size-3 shrink-0 opacity-70" aria-hidden />
                        {clientLine}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className={cx("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
                    <span className="font-medium">{badgeText}</span>
                    {p.due_date ? (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <Calendar className="size-3 shrink-0 opacity-70" aria-hidden />
                        <span>{formatDateFr(p.due_date)}</span>
                      </>
                    ) : null}
                  </p>
                  <p
                    className={cx(
                      "mt-1.5 text-sm font-medium leading-snug",
                      next.urgent ? "text-red-700 dark:text-red-300" : "text-slate-800 dark:text-slate-200",
                    )}
                  >
                    {next.line}
                  </p>
                  <p className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                    <span className="line-clamp-2">{addr}</span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Tablette / desktop : cartes existantes */}
      <ul className="hidden gap-4 md:grid md:grid-cols-2">
        {chantiers.map((p) => {
          const cid = p.client_id ? String(p.client_id) : "";
          const clientLine = (cid && clientNames[cid]?.trim()) || "Client à définir";
          const addr =
            (p.site_address?.trim() ||
              (cid && clientAddresses[cid]?.trim()) ||
              "Adresse du chantier non fournie") as string;
          const budget = Number(p.budget_estime ?? 0);
          const dot = statusDot(p.status);
          const badgeText = p.status?.trim() || "Chantier";
          const next = chantierNextActionDisplay(p);

          return (
            <li key={p.id} className={FLOWO_LIST_CARD_CLASS}>
              <Link href={`/chantiers/${p.id}`} className={cx("block transition hover:opacity-[0.98]", focusRing)}>
                <div className={cx("relative h-44 overflow-hidden", FLOWO_CARD_HERO_SURFACE_CLASS)}>
                  {showChantierHero ? (
                    <>
                      <Image
                        src={RENATO_HERO_CHANTIER}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" aria-hidden />
                    </>
                  ) : (
                    <>
                      <div className={FLOWO_CARD_HERO_GRADIENT_CLASS} />
                      <div className="absolute inset-0 flex items-center justify-center text-[color:var(--primary)]/35 dark:text-white/20">
                        <Wrench className="size-16" strokeWidth={1} aria-hidden />
                      </div>
                    </>
                  )}
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:bg-slate-950/90 dark:text-slate-100">
                    <span className={cx("size-2 shrink-0 rounded-full", dot)} aria-hidden />
                    {badgeText}
                  </div>
                </div>
                <div className="space-y-2 px-4 pb-3 pt-3">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{p.name}</h2>
                  <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <User className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{clientLine}</span>
                  </p>
                  <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{addr}</span>
                  </p>
                  <p
                    className={cx(
                      "rounded-lg border px-2 py-1.5 text-xs font-medium",
                      next.urgent
                        ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
                        : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200",
                    )}
                  >
                    Prochaine action : {next.line}
                  </p>
                </div>
              </Link>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="size-4 shrink-0 text-slate-400" aria-hidden />
                  {p.due_date ? (
                    <span>
                      Échéance <span className="font-medium text-slate-800 dark:text-slate-200">{formatDateFr(p.due_date)}</span>
                    </span>
                  ) : (
                    <span>Échéance —</span>
                  )}
                </p>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    {budget > 0 ? formatCurrencyEUR(budget) : "—"}
                  </p>
                  <p className="text-xs font-medium text-slate-400">Budget estimé</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
