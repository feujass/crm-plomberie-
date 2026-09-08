"use client";

import { Button } from "@/components/ui/Button";
import {
  countRedeposits,
  cycleStatusUiLabel,
  latestInformationalAlert,
  latestRejectionReason,
  MAX_REDEPOSITS,
  redepositGate,
} from "@/lib/facturation/pa/cycle-display";
import { scheduleFactureCycleUiRefresh } from "@/lib/facturation/pa/post-deposit-ui-refresh";
import type { CycleJournalRow } from "@/lib/facturation/pa/redeposit";
import { cx } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

const REDEPOSIT_CONFIRM =
  "Cette facture sera renvoyée à l'identique. Si votre client l'a refusée pour une erreur de montant ou d'adresse, créez plutôt un avoir.";

type Props = {
  factureId: string;
  statutCycleVie?: string | null;
  devisId?: string | null;
  events: CycleJournalRow[];
};

export function FactureCycleBannerClient({ factureId, statutCycleVie, devisId, events }: Props) {
  const router = useRouter();
  const titleId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<"avoir" | "nouvelle" | "redeposit" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const statut = statutCycleVie ?? "";
  const reason = latestRejectionReason(events);
  const redepositCount = countRedeposits(events.map((e) => e.statusCode));
  const gate = redepositGate(statut, redepositCount);
  const info = latestInformationalAlert(events);

  async function postAction(path: string, kind: "avoir" | "nouvelle" | "redeposit") {
    setErr(null);
    setPending(kind);
    try {
      const res = await fetch(path, { method: "POST", credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) {
        setErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
        return;
      }
      setConfirmOpen(false);
      if (data.id && data.id !== factureId) {
        router.push(`/facturation/${data.id}`);
        return;
      }
      router.refresh();
      if (kind === "redeposit") {
        scheduleFactureCycleUiRefresh(factureId, () => router.refresh());
      }
    } finally {
      setPending(null);
    }
  }

  if (statut === "rejetee") {
    return (
      <section
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100"
        aria-label={cycleStatusUiLabel("rejetee")}
      >
        <p className="font-semibold">Votre client a refusé cette facture.</p>
        {reason ? <p className="mt-1">Motif : {reason}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending !== null}
            isLoading={pending === "avoir"}
            onClick={() => void postAction(`/api/factures/${encodeURIComponent(factureId)}/avoir`, "avoir")}
          >
            Créer un avoir
          </Button>
          {gate.ok ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending !== null}
              onClick={() => {
                setErr(null);
                setConfirmOpen(true);
              }}
            >
              Redéposer cette facture
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled>
              Redéposer cette facture
            </Button>
          )}
        </div>
        {gate.ok ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/80">
            {gate.remaining} renvoi{gate.remaining > 1 ? "s" : ""} à l’identique restant
            {gate.remaining > 1 ? "s" : ""} sur {MAX_REDEPOSITS}.
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/80">{gate.message}</p>
        )}
        {err ? <p className="mt-2 text-sm text-red-700 dark:text-red-300">{err}</p> : null}

        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Renvoyer cette facture ?
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{REDEPOSIT_CONFIRM}</p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" disabled={pending !== null} onClick={() => setConfirmOpen(false)}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={pending !== null}
                  isLoading={pending === "redeposit"}
                  onClick={() => void postAction(`/api/factures/${encodeURIComponent(factureId)}/redeposit`, "redeposit")}
                >
                  Confirmer le renvoi
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  if (statut === "irrecevable") {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100"
        aria-label={cycleStatusUiLabel("irrecevable")}
      >
        <p className="font-semibold">
          Cette facture a été rejetée par la plateforme de facturation électronique. Elle ne peut pas être renvoyée.
        </p>
        {reason ? <p className="mt-1">Motif : {reason}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending !== null}
            isLoading={pending === "nouvelle"}
            onClick={() => void postAction(`/api/factures/${encodeURIComponent(factureId)}/nouvelle`, "nouvelle")}
          >
            Créer une nouvelle facture
          </Button>
          {devisId ? (
            <Button type="button" variant="secondary" asChild>
              <a href={`/devis/${encodeURIComponent(devisId)}`}>Ouvrir le devis</a>
            </Button>
          ) : null}
        </div>
        {err ? <p className="mt-2 text-sm text-red-700 dark:text-red-300">{err}</p> : null}
      </section>
    );
  }

  if (!info) return null;

  const isContestee = info.statusCode === "fr:207";
  return (
    <section
      className={cx(
        "rounded-2xl border px-4 py-3 text-sm",
        isContestee
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100"
          : "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-100",
      )}
    >
      {isContestee ? (
        <p>Le destinataire a contesté cette facture. Le statut ne change pas — voir le journal.</p>
      ) : (
        <p>Le destinataire a émis le paiement. L’encaissement ne sera confirmé que lorsqu’il sera reçu.</p>
      )}
    </section>
  );
}
