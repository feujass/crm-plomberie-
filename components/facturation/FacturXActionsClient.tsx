"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FacturXActionsClient({
  factureId,
  existingPath,
}: {
  factureId: string;
  existingPath?: string | null;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locked = Boolean(existingPath);

  if (locked) {
    return (
      <div className="flex flex-col gap-1">
        <a
          href={`/api/factures/${factureId}/facturx`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Télécharger Factur-X
        </a>
        <p className="text-xs text-slate-500">Document légal verrouillé — plus de régénération.</p>
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
