"use client";

import { Button } from "@/components/ui/Button";
import type { BackendTransmission } from "@/types/backend";
import { labelBranche, labelTransmissionKind, labelTransmissionStatus } from "@/lib/conformite/matrix";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FactureConformiteClient({
  factureId,
  factureNumero,
  totalTtc,
  dateEmission,
  branche,
  warnings,
  initialTransmissions,
}: {
  factureId: string;
  factureNumero?: string;
  totalTtc?: number;
  dateEmission?: string;
  branche?: string;
  warnings?: string[];
  initialTransmissions: BackendTransmission[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/30">
      <p className="font-semibold text-slate-900 dark:text-slate-100">Conformité (France)</p>
      <div className="grid gap-1 text-slate-700 dark:text-slate-300">
        {factureNumero ? (
          <p>
            <span className="font-medium">Facture :</span> {factureNumero}
          </p>
        ) : null}
        {typeof totalTtc === "number" ? (
          <p>
            <span className="font-medium">Montant TTC :</span>{" "}
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totalTtc)}
          </p>
        ) : null}
        {dateEmission ? (
          <p>
            <span className="font-medium">Émise le :</span>{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(dateEmission))}
          </p>
        ) : null}
        <p>
          <span className="font-medium">Transmissions :</span> {initialTransmissions.length}
        </p>
      </div>
      {branche ? (
        <p className="text-slate-700 dark:text-slate-300">
          <span className="font-medium">Branche :</span> {labelBranche(branche)}
        </p>
      ) : null}
      {warnings && warnings.length > 0 ? (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">Points à corriger :</p>
          <ul className="mt-1 list-inside list-disc text-slate-700 dark:text-slate-300">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-emerald-700 dark:text-emerald-300">Aucun avertissement bloquant listé pour cette facture.</p>
      )}
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-200">Transmissions (PDP / Chorus)</p>
        {initialTransmissions.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Aucun enregistrement — facture créée avant la mise à jour, ou erreur.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {initialTransmissions.map((t) => (
              <li key={`${t.kind}-${t.created_at}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900/40">
                <span className="font-medium">{labelTransmissionKind(String(t.kind))}</span>
                {" — "}
                <span>{labelTransmissionStatus(String(t.status))}</span>
                {t.detail ? (
                  <span className="block text-xs text-slate-600 dark:text-slate-400">{t.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={async () => {
            setErr(null);
            setPending(true);
            try {
              const res = await fetch(`/api/factures/${factureId}/transmissions/retry`, { method: "POST", credentials: "same-origin" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setErr(typeof (data as { message?: string }).message === "string" ? (data as { message: string }).message : `Erreur ${res.status}`);
                return;
              }
              router.refresh();
            } finally {
              setPending(false);
            }
          }}
        >
          Regénérer transmissions
        </Button>
        <a
          href={`/api/factures/${factureId}/chorus-export`}
          target="_blank"
          rel="noreferrer"
          download
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Télécharger export Chorus (JSON technique)
        </a>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Cet export est destiné à la conformité (Chorus/PDP) ou au support technique. Il n’envoie rien “tout seul”.
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
