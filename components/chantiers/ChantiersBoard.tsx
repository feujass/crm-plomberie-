"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CHANTIER_STATUS, CHANTIER_TYPES, type ChantierStatus, type EtapeMetier } from "@/lib/chantier";
import { cx } from "@/lib/utils";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

import { PhotosChantier } from "./PhotosChantier";
import { RentabiliteBloc } from "./RentabiliteBloc";
import { StepperMetier } from "./StepperMetier";

type SortMode = "due" | "progress";

type Props = {
  initialChantiers: Chantier[];
  clients: BackendClient[];
  devis: BackendDevis[];
};

function etapeIndex(e: string) {
  const order: EtapeMetier[] = ["terrassement", "maconnerie", "plomberie", "electricite", "finitions", "reception_client"];
  const i = order.indexOf(e as EtapeMetier);
  return i < 0 ? 0 : i;
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ChantiersBoard({ initialChantiers, clients, devis }: Props) {
  const [rows, setRows] = useState<Chantier[]>(initialChantiers);
  const [sort, setSort] = useState<SortMode>("due");

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

  const alertes = useMemo(() => {
    const items: { id: string; chantierId: string; type: "warning" | "danger"; message: string }[] = [];
    const today = todayMidnight();
    for (const p of rows) {
      if (p.status === "Terminé") continue;
      if (p.a_relancer) {
        items.push({ id: `rel-${p.id}`, chantierId: p.id, type: "danger", message: `À relancer · ${p.name}` });
      }
      if (p.due_date) {
        const due = new Date(`${p.due_date}T12:00:00`);
        const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
        if (diff >= 0 && diff <= 7) {
          items.push({
            id: `due-${p.id}`,
            chantierId: p.id,
            type: "warning",
            message: `Échéance ${diff <= 0 ? "aujourd’hui" : `dans ${diff} j`} · ${p.name}`,
          });
        }
      }
    }
    return items;
  }, [rows]);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sort === "due") {
      list.sort((a, b) => String(a.due_date ?? "9999-12-31").localeCompare(String(b.due_date ?? "9999-12-31")));
    } else {
      list.sort((a, b) => etapeIndex(String(b.etape_metier ?? "")) - etapeIndex(String(a.etape_metier ?? "")));
    }
    return list;
  }, [rows, sort]);

  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    client_id: clients[0]?.id ?? "",
    chantier_type: "plomberie",
    site_address: "",
    devis_id: "",
    budget_estime: "",
    heures_prevues: "",
    responsible: "",
    comment: "",
    due_date: "",
    etape_metier: "terrassement",
  });

  const submitCreate = async () => {
    setCreateError(null);
    if (!form.name.trim()) return setCreateError("Indiquez un nom de chantier.");
    if (!form.client_id) return setCreateError("Sélectionnez un client.");
    if (!form.due_date) return setCreateError("Indiquez une échéance.");
    setCreateBusy(true);
    try {
      const res = await fetch("/api/chantiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          client_id: String(form.client_id),
          status: "Planifié",
          due_date: form.due_date,
          responsible: form.responsible.trim(),
          comment: form.comment.trim(),
          site_address: form.site_address.trim(),
          chantier_type: form.chantier_type,
          devis_id: form.devis_id ? String(form.devis_id) : null,
          budget_estime: form.budget_estime ? Number(String(form.budget_estime).replace(",", ".")) : 0,
          heures_prevues: form.heures_prevues ? Number(String(form.heures_prevues).replace(",", ".")) : 0,
          heures_passees: 0,
          etape_metier: form.etape_metier,
          photo_urls: [],
          a_relancer: false,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const created = (await res.json()) as Chantier;
      setRows((r) => [created, ...r]);
      setForm((f) => ({ ...f, name: "", site_address: "", devis_id: "", budget_estime: "", heures_prevues: "", responsible: "", comment: "", due_date: "", etape_metier: "terrassement" }));
    } catch {
      setCreateError("Création impossible. Vérifiez le backend.");
    } finally {
      setCreateBusy(false);
    }
  };

  const patch = async (id: string, body: Partial<Chantier>) => {
    const res = await fetch(`/api/chantiers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
    const updated = (await res.json()) as Chantier;
    setRows((r) => r.map((x) => (x.id === id ? updated : x)));
  };

  const scrollToChantier = (chantierId: string) => {
    requestAnimationFrame(() => {
      document.getElementById(`chantier-${chantierId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Chantiers</h1>
        <Link href="/chantiers/nouveau" className="rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-95">
          Nouveau chantier
        </Link>
      </div>

      {alertes.length ? (
        <Card title="Alertes">
          <div className="flex flex-col gap-2">
            {alertes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => scrollToChantier(a.chantierId)}
                className={cx(
                  "rounded-lg border px-3 py-2 text-left text-sm font-semibold",
                  a.type === "danger"
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
                    : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
                )}
              >
                {a.message}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Nouveau chantier">
          <div className="grid gap-3">
            <label className="block text-sm font-medium">
              Nom du chantier
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex. rénovation salle de bain"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Client
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  value={String(form.client_id)}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.prenom, c.nom].filter(Boolean).join(" ").trim() || c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Type
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  value={form.chantier_type}
                  onChange={(e) => setForm((f) => ({ ...f, chantier_type: e.target.value }))}
                >
                  {CHANTIER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium">
              Adresse du chantier
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                value={form.site_address}
                onChange={(e) => setForm((f) => ({ ...f, site_address: e.target.value }))}
                placeholder="Distincte de l’adresse client si besoin"
              />
            </label>

            <label className="block text-sm font-medium">
              Devis associé
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                value={form.devis_id}
                onChange={(e) => setForm((f) => ({ ...f, devis_id: e.target.value }))}
              >
                <option value="">— Aucun —</option>
                {devis.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.numero ?? d.id}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Budget estimé (€)
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  value={form.budget_estime}
                  onChange={(e) => setForm((f) => ({ ...f, budget_estime: e.target.value }))}
                  placeholder="0"
                />
              </label>
              <label className="block text-sm font-medium">
                Heures prévues
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  value={form.heures_prevues}
                  onChange={(e) => setForm((f) => ({ ...f, heures_prevues: e.target.value }))}
                  placeholder="0"
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Avancement métier
              <div className="mt-2">
                <StepperMetier value={form.etape_metier as EtapeMetier} onChange={(s) => setForm((f) => ({ ...f, etape_metier: s }))} />
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Responsable
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  value={form.responsible}
                  onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
                  placeholder="Nom du responsable"
                />
              </label>
              <label className="block text-sm font-medium">
                Échéance
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Commentaire
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Infos utiles du chantier"
              />
            </label>

            {createError ? <p className="text-sm text-red-600 dark:text-red-300">{createError}</p> : null}
            <Button type="button" isLoading={createBusy} loadingText="Création…" onClick={() => void submitCreate()}>
              Créer le chantier
            </Button>
          </div>
        </Card>

        <Card title="Vue chantiers">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted-foreground)]">Mise à jour rapide par échéance et avancement métier.</p>
            <div className="flex gap-2">
              <Button type="button" variant={sort === "due" ? "secondary" : "ghost"} onClick={() => setSort("due")}>
                Échéance
              </Button>
              <Button type="button" variant={sort === "progress" ? "secondary" : "ghost"} onClick={() => setSort("progress")}>
                Avancement
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {sorted.map((p) => (
              <Card key={p.id} className="p-0">
                <div id={`chantier-${p.id}`} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold">{p.name}</h3>
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
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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

                    <Link href={`/chantiers/${p.id}`} className="text-sm font-semibold text-[color:var(--primary)] hover:underline">
                      Ouvrir →
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <span className="text-sm font-semibold text-[var(--foreground)]">Étapes métier</span>
                      <div className="mt-2">
                        <StepperMetier
                          value={String(p.etape_metier ?? "terrassement") as EtapeMetier}
                          onChange={(s) => void patch(p.id, { etape_metier: s })}
                          compact
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium">
                        Statut opérationnel
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          value={String(p.status ?? "Planifié")}
                          onChange={(e) => void patch(p.id, { status: e.target.value as ChantierStatus })}
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
                          onClick={() => void patch(p.id, { a_relancer: !p.a_relancer })}
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
                            await patch(p.id, { heures_passees: newVal });
                          }}
                        />
                      </div>
                    </div>

                    <PhotosChantier
                      photoUrls={(p.photo_urls ?? []) as string[]}
                      onChange={async (urls) => {
                        await patch(p.id, { photo_urls: urls });
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}

            {sorted.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Aucun chantier pour l’instant.</p>
            ) : null}
          </div>
        </Card>
      </div>
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
        className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void submit()}>
        + Ajouter
      </Button>
    </div>
  );
}

