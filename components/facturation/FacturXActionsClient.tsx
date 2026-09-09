"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { scheduleFactureCycleUiRefresh } from "@/lib/facturation/pa/post-deposit-ui-refresh";

export function FacturXActionsClient({
  factureId,
  existingPath,
  canDeposit,
}: {
  factureId: string;
  existingPath?: string | null;
  canDeposit?: boolean;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locked = Boolean(existingPath);

  if (locked) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/factures/${factureId}/facturx`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Télécharger Factur-X
          </a>
          {canDeposit ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              isLoading={pending}
              onClick={async () => {
                setErr(null);
                setPending(true);
                try {
                  const res = await fetch(`/api/factures/${factureId}/deposit`, {
                    method: "POST",
                    credentials: "same-origin",
                  });
                  const data = (await res.json().catch(() => ({}))) as {
                    message?: string;
                    failures?: string[];
                  };
                  if (!res.ok) {
                    setErr(
                      Array.isArray(data.failures) && data.failures.length > 0
                        ? data.failures.join("\n")
                        : typeof data.message === "string"
                          ? data.message
                          : `Erreur ${res.status}`,
                    );
                    return;
                  }
                  router.refresh();
                  scheduleFactureCycleUiRefresh(factureId, () => router.refresh());
                } finally {
                  setPending(false);
                }
              }}
            >
              Déposer auprès de la plateforme
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">Document Factur-X verrouillé — plus de régénération.</p>
        {err ? <p className="text-sm text-red-600 whitespace-pre-line">{err}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        isLoading={pending}
        onClick={async () => {
          setErr(null);
          setPending(true);
          try {
            const res = await fetch(`/api/factures/${factureId}/facturx`, {
              method: "POST",
              credentials: "same-origin",
            });
            const data = (await res.json().catch(() => ({}))) as { message?: string };
            if (!res.ok) {
              setErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
              return;
            }
            router.refresh();
          } finally {
            setPending(false);
          }
        }}
      >
        Générer Factur-X
      </Button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
