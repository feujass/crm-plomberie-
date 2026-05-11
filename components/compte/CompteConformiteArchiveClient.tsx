"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";

export function CompteConformiteArchiveClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mt-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input label="Date début (YYYY-MM-DD)" name="df" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Date fin (YYYY-MM-DD)" name="dt" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setErr(null);
          setPending(true);
          try {
            const q = new URLSearchParams();
            if (from.trim()) q.set("date_from", from.trim());
            if (to.trim()) q.set("date_to", to.trim());
            const suffix = q.toString() ? `?${q.toString()}` : "";
            const res = await fetch(`/api/conformite/archive${suffix}`, { credentials: "same-origin" });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              setErr(typeof (j as { message?: string }).message === "string" ? (j as { message: string }).message : `Erreur ${res.status}`);
              return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `flowo-conformite-archive-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Erreur");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "…" : "Télécharger archive JSON"}
      </Button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
