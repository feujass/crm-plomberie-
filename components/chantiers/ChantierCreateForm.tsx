"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CHANTIER_TYPES, type EtapeMetier } from "@/lib/chantier";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

import { StepperMetier } from "./StepperMetier";

/** Préremplissage depuis un devis accepté (parcours guidé). */
export type ChantierPrefillFromDevis = {
  name: string;
  client_id: string;
  site_address: string;
  devis_id: string;
  budget_estime: string;
  due_date: string;
  next_action_label: string;
  next_action_date: string;
  chantier_type?: string;
};

type Props = {
  clients: BackendClient[];
  devis: BackendDevis[];
  /** Si défini, appelé après création (ex. mise à jour liste). Sinon redirection vers /chantiers. */
  onCreated?: (chantier: Chantier) => void;
  /** Données issues du devis (URL `?devis=`) — client, adresse chantier, montant, échéance. */
  prefill?: ChantierPrefillFromDevis | null;
};

export function ChantierCreateForm({ clients, devis, onCreated, prefill }: Props) {
  const router = useRouter();
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
    next_action_label: "",
    next_action_date: "",
  });

  useEffect(() => {
    if (!prefill) return;
    setForm((f) => ({
      ...f,
      name: prefill.name,
      client_id: prefill.client_id || f.client_id,
      chantier_type: prefill.chantier_type ?? f.chantier_type,
      site_address: prefill.site_address,
      devis_id: prefill.devis_id,
      budget_estime: prefill.budget_estime,
      due_date: prefill.due_date,
      next_action_label: prefill.next_action_label,
      next_action_date: prefill.next_action_date,
    }));
  }, [prefill]);

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
          next_action_label: form.next_action_label.trim(),
          next_action_date: form.next_action_date.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const created = (await res.json()) as Chantier;
      setForm((f) => ({
        ...f,
        name: "",
        site_address: "",
        devis_id: "",
        budget_estime: "",
        heures_prevues: "",
        responsible: "",
        comment: "",
        due_date: "",
        etape_metier: "terrassement",
        next_action_label: "",
        next_action_date: "",
      }));
      if (onCreated) onCreated(created);
      else {
        router.push("/chantiers");
        router.refresh();
      }
    } catch {
      setCreateError("Création impossible. Vérifiez le backend.");
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {prefill ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100">
          <strong>Devis gagné :</strong> les infos ci-dessous viennent du devis (adresse chantier, client, montant). Tu peux
          tout ajuster — rien n’est modifié sur le devis.
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
          Astuce : depuis un devis <strong>accepté</strong>, utilise le bouton <strong>« Créer le chantier à partir de ce devis »</strong> pour
          éviter les doubles saisies.
        </p>
      )}

      <label className="block text-sm font-medium">
        Nom du chantier
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ex. rénovation salle de bain"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Client
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            value={String(form.client_id)}
            onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
          >
            {clients.length === 0 ? <option value="">— Aucun client —</option> : null}
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
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          value={form.site_address}
          onChange={(e) => setForm((f) => ({ ...f, site_address: e.target.value }))}
          placeholder="Préremplie depuis le devis si tu viens d’un devis gagné"
        />
      </label>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Prochaine étape</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Rappel concret (appel client, passage, envoi d’acompte…) — affiché sur l’accueil et la liste chantiers.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Action
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={form.next_action_label}
              onChange={(e) => setForm((f) => ({ ...f, next_action_label: e.target.value }))}
              placeholder="Ex. Appeler le client pour caler le démarrage"
            />
          </label>
          <label className="block text-sm font-medium">
            Date cible
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={form.next_action_date}
              onChange={(e) => setForm((f) => ({ ...f, next_action_date: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Échéance chantier
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium">
          Commentaire
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder="Infos utiles"
          />
        </label>
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50/80 open:shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
        <summary className="cursor-pointer list-none rounded-t-xl bg-slate-50/80 px-3 py-2.5 text-sm font-semibold text-slate-800 [-webkit-tap-highlight-color:transparent] dark:bg-slate-900/40 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
          Plus d’options (devis lié, budget, heures, étapes, responsable)
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
          <label className="block text-sm font-medium">
            Devis associé
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                value={form.budget_estime}
                onChange={(e) => setForm((f) => ({ ...f, budget_estime: e.target.value }))}
                placeholder="0"
              />
            </label>
            <label className="block text-sm font-medium">
              Heures prévues
              <input
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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

          <label className="block text-sm font-medium">
            Responsable
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={form.responsible}
              onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
              placeholder="Nom du responsable"
            />
          </label>
        </div>
      </details>

      {createError ? <p className="text-sm text-red-600 dark:text-red-300">{createError}</p> : null}
      <Button type="button" isLoading={createBusy} loadingText="Création…" onClick={() => void submitCreate()}>
        Créer le chantier
      </Button>
    </div>
  );
}
