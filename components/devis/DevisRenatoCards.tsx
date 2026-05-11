"use client";

import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import {
  FLOWO_CARD_HERO_GRADIENT_CLASS,
  FLOWO_CARD_HERO_SURFACE_CLASS,
  FLOWO_EMPTY_LIST_CLASS,
  FLOWO_LIST_CARD_CLASS,
} from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";
import type { BackendDevis } from "@/types/backend";
import { Copy, FileText, MapPin, Trash2, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const STATUS_DOT: Record<string, string> = {
  brouillon: "bg-slate-500",
  envoye: "bg-[color:var(--primary)]",
  accepte: "bg-emerald-500",
  refuse: "bg-red-500",
  facture: "bg-indigo-500",
  archive: "bg-slate-400",
  expire: "bg-amber-500",
};

const STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Devis disponible",
  accepte: "Accepté",
  refuse: "Refusé",
  facture: "Facturé",
  archive: "Archivé",
  expire: "Expiré",
};

function labelStatut(statut?: string) {
  const s = statut ?? "";
  return STATUS_LABEL[s] ?? "Devis";
}

export type DevisListSegment = "en_cours" | "termine";

type Props = {
  devis: BackendDevis[];
  clientAddresses: Record<string, string>;
  listSegment: DevisListSegment;
};

export function DevisRenatoCards({ devis, clientAddresses, listSegment }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function duplicateDevis(id: string) {
    const res = await fetch(`/api/devis/${id}/duplicate`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    if (res.ok && data?.id) {
      router.push(`/devis/${data.id}`);
      router.refresh();
    }
  }

  async function removeDevis(id: string) {
    const res = await fetch(`/api/devis/${id}/delete`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (!devis.length) {
    return (
      <p className={FLOWO_EMPTY_LIST_CLASS}>
        Aucun devis dans cette catégorie. Changez d&apos;onglet ou créez un nouveau devis.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {devis.map((d) => {
        const nom = d.client_nom?.trim();
        const clientLine = nom && nom !== "—" ? nom : "Client à définir";
        const addr =
          (d.client_id && clientAddresses[String(d.client_id)]?.trim()) || "Adresse du chantier non fournie";
        const ht = Number(d.total_ht ?? 0);
        const ttc = Number(d.total_ttc ?? 0);
        const montant = ht > 0 ? ht : ttc;
        const montantLabel = ht > 0 ? "HT" : "TTC";
        const statut = d.statut ?? "";
        const dot = STATUS_DOT[statut] ?? "bg-[color:var(--primary)]";
        const titreDate = d.created_at ? `Devis du ${formatDateFr(d.created_at)}` : d.numero ?? "Devis";

        return (
          <li key={d.id} className={FLOWO_LIST_CARD_CLASS}>
            <Link href={`/devis/${d.id}`} className={cx("block transition hover:opacity-[0.98]", focusRing)}>
              <div className={cx("relative h-44 overflow-hidden", FLOWO_CARD_HERO_SURFACE_CLASS)}>
                <>
                  <div className={FLOWO_CARD_HERO_GRADIENT_CLASS} />
                  <div className="absolute inset-0 flex items-center justify-center text-[color:var(--primary)]/35 dark:text-white/20">
                    <FileText className="size-16" strokeWidth={1} aria-hidden />
                  </div>
                </>
                <div
                  className={cx(
                    "absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
                    showChantierHero
                      ? "bg-white/95 text-slate-800 dark:bg-slate-950/90 dark:text-slate-100"
                      : "bg-white/95 text-slate-800 dark:bg-slate-950/90 dark:text-slate-100",
                  )}
                >
                  <span className={cx("size-2 shrink-0 rounded-full", dot)} aria-hidden />
                  {labelStatut(statut)}
                </div>
              </div>
              <div className="space-y-2 px-4 pb-3 pt-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{titreDate}</h2>
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending}
                  title="Dupliquer"
                  className={cx(
                    "touch-target flex size-10 items-center justify-center rounded-xl text-[color:var(--primary)] transition hover:bg-[color:var(--primary)]/10 disabled:opacity-50",
                    focusRing,
                  )}
                  onClick={() => startTransition(() => void duplicateDevis(d.id))}
                >
                  <Copy className="size-5" aria-hidden />
                  <span className="sr-only">Dupliquer</span>
                </button>
                <button
                  type="button"
                  disabled={pending}
                  title="Supprimer"
                  className={cx(
                    "touch-target flex size-10 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30",
                    focusRing,
                  )}
                  onClick={() => {
                    if (!confirm("Supprimer ce devis ? Cette action est définitive.")) return;
                    startTransition(() => void removeDevis(d.id));
                  }}
                >
                  <Trash2 className="size-5" aria-hidden />
                  <span className="sr-only">Supprimer</span>
                </button>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {formatCurrencyEUR(montant)}
                </p>
                <p className="text-xs font-medium text-slate-400">{montantLabel}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
