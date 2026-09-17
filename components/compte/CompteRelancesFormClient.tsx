"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Bell, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompteRelancesFormClient({
  initial,
}: {
  initial: { relance_devis_echeances: string; relance_facture_echeances: string };
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setOkMsg(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await fetch("/api/compte/relances", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              relance_devis_echeances: String(fd.get("relance_devis_echeances") || "").trim(),
              relance_facture_echeances: String(fd.get("relance_facture_echeances") || "").trim(),
            }),
          });
          const json = (await res.json().catch(() => ({}))) as { message?: string; warning?: string };
          if (!res.ok) throw new Error(json.message ?? `Erreur ${res.status}`);
          setOkMsg(json.message ?? "Relances enregistrées.");
          router.refresh();
        } catch (er) {
          setErr(er instanceof Error ? er.message : "Erreur");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="size-5 text-gray-700 dark:text-gray-300" aria-hidden />
          <p className="font-semibold text-[var(--foreground)]">Calendrier des relances</p>
        </div>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Indiquez les jours séparés par des virgules. Flowo enverra une relance au client à chaque étape (e-mail
          avec le template Flowo).
        </p>
        <div className="space-y-3">
          <Input
            label="Devis — jours après l’envoi"
            name="relance_devis_echeances"
            defaultValue={initial.relance_devis_echeances}
            placeholder="3, 7, 14"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ex. 3, 7, 14 = relances à J+3, J+7 et J+14 après l’envoi du devis.
          </p>
          <Input
            label="Factures — jours après l’échéance"
            name="relance_facture_echeances"
            defaultValue={initial.relance_facture_echeances}
            placeholder="0, 7, 14"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ex. 0, 7, 14 = le jour de l’échéance, puis J+7 et J+14.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 flex items-center gap-2">
          <Bell className="size-5 text-gray-700 dark:text-gray-300" aria-hidden />
          <p className="font-semibold text-[var(--foreground)]">Vos alertes</p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          À chaque relance automatique, Flowo peut aussi vous prévenir par <strong>e-mail</strong> selon vos réglages
          dans{" "}
          <Link href="/compte/notifications" className="font-medium text-[color:var(--primary)] underline-offset-2 hover:underline">
            Notifications
          </Link>
          .
        </p>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {okMsg ? <p className="text-sm text-green-700 dark:text-green-400">{okMsg}</p> : null}

      <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={pending}>
        {pending ? "…" : "Enregistrer les relances"}
      </Button>
    </form>
  );
}
