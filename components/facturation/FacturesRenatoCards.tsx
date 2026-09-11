"use client";

import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import {
  FLOWO_CARD_HERO_GRADIENT_CLASS,
  FLOWO_CARD_HERO_SURFACE_CLASS,
  FLOWO_EMPTY_LIST_CLASS,
  FLOWO_LIST_CARD_CLASS,
} from "@/lib/flowo-ui";
import { RENATO_HERO_FACTURE_TERMINE } from "@/lib/renato-hero";
import { cx, focusRing } from "@/lib/utils";
import type { BackendFacture } from "@/types/backend";
import { FileText, MapPin, Receipt, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type FactureListSegment = "en_cours" | "termine";

const FACTURE_DOT: Record<string, string> = {
  emise: "bg-[color:var(--primary)]",
  partiellement_payee: "bg-amber-500",
  payee: "bg-emerald-500",
};

const FACTURE_LABEL: Record<string, string> = {
  emise: "En attente de paiement",
  partiellement_payee: "Partiellement payée",
  payee: "Payée",
};

function labelFacture(statut?: string) {
  const s = statut ?? "";
  return FACTURE_LABEL[s] ?? (s ? s.replace(/_/g, " ") : "Facture");
}

function dotFacture(statut?: string) {
  const s = statut ?? "";
  return FACTURE_DOT[s] ?? "bg-[color:var(--primary)]";
}

type Props = {
  factures: BackendFacture[];
  clientAddresses: Record<string, string>;
  listSegment: FactureListSegment;
};

export function FacturesRenatoCards({ factures, clientAddresses, listSegment }: Props) {
  const showFactureHero = listSegment === "termine";

  if (!factures.length) {
    return (
      <p className={FLOWO_EMPTY_LIST_CLASS}>
        Aucune facture dans cette catégorie. Émettez une facture depuis un devis accepté.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {factures.map((f) => {
        const nom = f.client_nom?.trim();
        const clientLine = nom && nom !== "—" ? nom : "Client à définir";
        const cid = f.client_id ? String(f.client_id) : "";
        const addr =
          (cid && clientAddresses[cid]?.trim()) || "Adresse non renseignée";
        const statut = f.statut ?? "";
        const dot = dotFacture(statut);
        const titre = f.date_emission
          ? `Facture du ${formatDateFr(f.date_emission)}`
          : f.numero ?? "Facture";
        const ttc = Number(f.total_ttc ?? 0);

        return (
          <li key={f.id} className={FLOWO_LIST_CARD_CLASS}>
            <Link href={`/facturation/${f.id}`} className={cx("block transition hover:opacity-[0.98]", focusRing)}>
              <div className={cx("relative h-44 overflow-hidden", FLOWO_CARD_HERO_SURFACE_CLASS)}>
                {showFactureHero ? (
                  <>
                    <Image
                      src={RENATO_HERO_FACTURE_TERMINE}
                      alt="Illustration facture réglée"
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
                      <Receipt className="size-16" strokeWidth={1} aria-hidden />
                    </div>
                  </>
                )}
                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:bg-slate-950/90 dark:text-slate-100">
                  <span className={cx("size-2 shrink-0 rounded-full", dot)} aria-hidden />
                  {labelFacture(statut)}
                </div>
              </div>
              <div className="space-y-2 px-4 pb-3 pt-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {f.numero ? (
                    <>
                      <span className="text-slate-500 dark:text-slate-400">{f.numero}</span>
                      <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                    </>
                  ) : null}
                  {titre}
                </h2>
                <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <User className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span>{clientLine}</span>
                </p>
                <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span>{addr}</span>
                </p>
              </div>
            </Link>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span>TTC</span>
              </p>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyEUR(ttc)}</p>
                <p className="text-xs font-medium text-slate-400">Total</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
