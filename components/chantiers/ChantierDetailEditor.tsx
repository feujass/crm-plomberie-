"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CHANTIER_STATUS, type ChantierStatus, type EtapeMetier } from "@/lib/chantier";
import { formatDateFr } from "@/lib/format";
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
  const [naLabel, setNaLabel] = useState(initial.next_action_label ?? "");
  const [naDate, setNaDate] = useState(initial.next_action_date ?? "");
  const [naBusy, setNaBusy] = useState(false);

  useEffect(() => {
    setP(initial);
    setNaLabel(initial.next_action_label ?? "");
    setNaDate(initial.next_action_date ?? "");
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
    return updated;
  };

  const saveNextAction = async () => {
    setNaBusy(true);
    try {
      await patch({
        next_action_label: naLabel.trim(),
        next_action_date: naDate.trim() ? naDate.trim() : "",
      });
    } finally {
      setNaBusy(false);
    }
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
              {getClientName(p.client_id)}
              {p.due_date ? ` · Échéance ${formatDateFr(p.due_date)}` : ""}
              {p.responsible ? ` · Resp. ${p.responsible}` : ""}
            </p>
            {p.site_address ? (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                <span className="font-medium">Chantier :</span> {p.site_address}
              </p>
            ) : null}
            {p.devis_id && getDevisRef(p.devis_id) ? (
              <p className="mt-1 text-sm">
                <Link href={`/devis/${p.devis_id}`} className="text-[color:var(--primary)] hover:underline">
                  Devis {getDevisRef(p.devis_id)}
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Prochaine étape</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Visible sur l&apos;accueil et la liste chantiers. Ex.&nbsp;: appeler le client, envoyer l&apos;acompte, passage technique.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Action
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                value={naLabel}
                onChange={(e) => setNaLabel(e.target.value)}
                placeholder="Ex. Relancer pour date de démarrage"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Date cible
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                value={naDate}
                onChange={(e) => setNaDate(e.target.value)}
              />
            </label>
          </div>
          <Button type="button" variant="secondary" className="mt-3" disabled={naBusy} onClick={() => void saveNextAction()}>
            {naBusy ? "…" : "Enregistrer la prochaine étape"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Statut opérationnel
            <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
              Planifié = pas démarré · En cours = travaux · Urgent = priorité · Terminé = chantier clos
            </p>
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
            Relance client
            <Button
              type="button"
              variant={p.a_relancer ? "secondary" : "ghost"}
              onClick={() => void patch({ a_relancer: !p.a_relancer })}
              className="mt-1 w-full justify-center"
            >
              {p.a_relancer ? "Désactiver la relance" : "Marquer à relancer"}
            </Button>
          </label>
        </div>

        <details className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] open:shadow-sm">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            Avancement détaillé, budget, heures &amp; photos
          </summary>
          <div className="space-y-4 border-t border-[var(--border)] p-3">
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
        </details>
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
