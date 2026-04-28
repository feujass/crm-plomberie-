"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FacturePaiementFormClient({ factureId }: { factureId: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await fetch(`/api/factures/${factureId}/paiements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              montant: Number(fd.get("montant") || 0),
              date: String(fd.get("date") || ""),
              mode: String(fd.get("mode") || "virement"),
            }),
          });
          const json = (await res.json().catch(() => ({}))) as { message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          e.currentTarget.reset();
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Input label="Montant" name="montant" type="number" step="0.01" required />
      <Input label="Date" name="date" type="date" required />
      <label className="block text-sm font-medium">
        Mode
        <select
          name="mode"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue="virement"
        >
          <option value="virement">Virement</option>
          <option value="cheque">Chèque</option>
          <option value="especes">Espèces</option>
          <option value="cb">CB</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      {err ? <p className="w-full text-sm text-red-600">{err}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Enregistrer paiement"}
      </Button>
    </form>
  );
}
