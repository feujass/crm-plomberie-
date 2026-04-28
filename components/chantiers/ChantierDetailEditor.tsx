"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CHANTIER_STATUS, type ChantierStatus, type EtapeMetier } from "@/lib/chantier";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

import { PhotosChantier } from "./PhotosChantier";
import { RentabiliteBloc } from "./RentabiliteBloc";
import { StepperMetier } from "./StepperMetier";

type Props = {
  initial: Chantier;
  clients: BackendClient[];
  devis: BackendDevis[];
};

export function ChantierDetailEditor({ initial, clients, devis }: Props) {
  const [p, setP] = useState(initial);

  useEffect(() => {
    setP(initial);
  }, [initial]);

  const getClientName = (id: string | null | undefined) => {
    if (!id) return "—";
    const c = clients.find((x) => String(x.id) === String(id));
    return c ? [c.prenom, c.nom].filter(Boolean).join(" ").trim() || c.nom : "—";
  };

  const getDevisRef = (id: string | null | undefined) => {
    if (!id) return null;
    const d = devis.find((x) => String(x.id) === String(id));
    return d?.numero ?? null;
  };

  const patch = async (body: Partial<Chantier>) => {
    const res = await fetch(`/api/chantiers/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
    const updated = (await res.json()) as Chantier;
    setP(updated);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {p.a_relancer || p.status === "Urgent" ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-950/40 dark:text-red-100">
                  À relancer
                </span>
              ) : null}
              {p.status ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                  {p.status}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {getClientName(p.client_id)} · {p.site_address ? `Chantier : ${p.site_address} · ` : ""}
              {p.due_date ? `Échéance : ${p.due_date}` : "Échéance : —"}
              {p.responsible ? ` · Responsable : ${p.responsible}` : ""}
            </p>
            {p.devis_id && getDevisRef(p.devis_id) ? (
              <p className="mt-1 text-sm">
                <Link href={`/devis/${p.devis_id}`} className="text-[color:var(--primary)] hover:underline">
                  Devis {getDevisRef(p.devis_id)}
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <span className="text-sm font-semibold text-[var(--foreground)]">Étapes métier</span>
            <div className="mt-2">
              <StepperMetier
                value={String(p.etape_metier ?? "terrassement") as EtapeMetier}
                onChange={(s) => void patch({ etape_metier: s })}
                compact
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Statut opérationnel
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                value={String(p.status ?? "Planifié")}
                onChange={(e) => void patch({ status: e.target.value as ChantierStatus })}
              >
                {CHANTIER_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Relance
              <Button
                type="button"
                variant={p.a_relancer ? "secondary" : "ghost"}
                onClick={() => void patch({ a_relancer: !p.a_relancer })}
                className="mt-1 w-full justify-center"
              >
                {p.a_relancer ? "Désactiver" : "Marquer à relancer"}
              </Button>
            </label>
          </div>

          <RentabiliteBloc
            budget={Number(p.budget_estime ?? 0)}
            heuresPrevues={Number(p.heures_prevues ?? 0)}
            heuresPassees={Number(p.heures_passees ?? 0)}
          />

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                Heures passées : <strong>{Number(p.heures_passees ?? 0)}h</strong>
              </p>
              <AddHoursInline
                onAdd={async (delta) => {
                  const newVal = Number(p.heures_passees ?? 0) + delta;
                  await patch({ heures_passees: newVal });
                }}
              />
            </div>
          </div>

          <PhotosChantier
            photoUrls={(p.photo_urls ?? []) as string[]}
            onChange={async (urls) => {
              await patch({ photo_urls: urls });
            }}
          />
        </div>
      </Card>
    </div>
  );
}

function AddHoursInline({ onAdd }: { onAdd: (delta: number) => Promise<void> | void }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const raw = v.trim().replace(",", ".");
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setBusy(true);
    try {
      await Promise.resolve(onAdd(n));
      setV("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-stretch gap-2">
      <input
        inputMode="decimal"
        placeholder="ex. 1,5"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void submit()}>
        + Ajouter
      </Button>
    </div>
  );
}
