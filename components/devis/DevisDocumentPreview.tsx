"use client";

import { formatCurrencyEUR } from "@/lib/format";
import { computeDevisTotals, ligneTotalHt } from "@/lib/devis-math";
import { resolveClientLogoDisplayUrl } from "@/lib/supabase/client-logo-display";
import { cx, focusRing } from "@/lib/utils";
import type { BackendClient, BackendProfile } from "@/types/backend";
import type { DevisLigneInput } from "@/types/devis";
import { useEffect, useMemo, useState } from "react";

type LignePreview = DevisLigneInput & { id?: string };

type Props = {
  numero: string;
  statutLabel: string;
  profile: BackendProfile;
  clients: BackendClient[];
  clientId: string;
  onClientIdChange: (id: string) => void;
  adresseChantier: string;
  onAdresseChantierChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  lignes: LignePreview[];
  remiseType: "percent" | "fixed" | "";
  remiseValue: number | "";
  onEditLines: () => void;
  onSend?: () => void;
};

const fieldClass =
  "w-full border-0 border-b border-transparent bg-transparent px-0 py-1 text-inherit shadow-none focus:border-[color:var(--primary)]/40 focus:outline-none focus:ring-0";

export function DevisDocumentPreview({
  numero,
  statutLabel,
  profile,
  clients,
  clientId,
  onClientIdChange,
  adresseChantier,
  onAdresseChantierChange,
  notes,
  onNotesChange,
  lignes,
  remiseType,
  remiseValue,
  onEditLines,
  onSend,
}: Props) {
  const [logoDisplayUrl, setLogoDisplayUrl] = useState("");

  useEffect(() => {
    const raw = profile.logo_url?.trim() ?? "";
    if (!raw) {
      setLogoDisplayUrl("");
      return;
    }
    void resolveClientLogoDisplayUrl(raw).then((url) => setLogoDisplayUrl(url || ""));
  }, [profile.logo_url]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const clientName = selectedClient
    ? [selectedClient.prenom, selectedClient.nom].filter(Boolean).join(" ").trim() || selectedClient.nom
    : "—";

  const totals = useMemo(() => {
    const mapped = lignes.map((l) => ({
      total_ht: ligneTotalHt({ quantite: l.quantite, prix_ht: l.prix_ht }),
      tva: l.tva,
    }));
    return computeDevisTotals(mapped, remiseType || null, remiseValue === "" ? null : Number(remiseValue));
  }, [lignes, remiseType, remiseValue]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {logoDisplayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDisplayUrl}
                  alt=""
                  className="mb-2 h-14 w-auto max-w-[140px] rounded-lg object-contain"
                  onError={() => setLogoDisplayUrl("")}
                />
              ) : null}
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {profile.entreprise?.trim() || "Votre entreprise"}
              </p>
              {profile.adresse?.trim() ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{profile.adresse}</p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {[profile.tel, profile.email_facturation].filter(Boolean).join(" · ")}
              </p>
              {profile.siret?.trim() ? (
                <p className="text-xs text-slate-500">SIRET {profile.siret}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--primary)]">Devis</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{numero}</p>
              <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {statutLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:px-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <select
              className={cx(fieldClass, "mt-1 text-base font-semibold text-slate-900 dark:text-slate-100")}
              value={clientId}
              onChange={(e) => onClientIdChange(e.target.value)}
            >
              <option value="">— Choisir ou créer via Zeus —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                </option>
              ))}
            </select>
            {!clientId && clientName !== "—" ? (
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{clientName}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adresse chantier</p>
            <textarea
              rows={3}
              className={cx(fieldClass, "mt-1 resize-none text-sm leading-relaxed text-slate-800 dark:text-slate-200")}
              placeholder="Lieu d'intervention"
              value={adresseChantier}
              onChange={(e) => onAdresseChantierChange(e.target.value)}
            />
          </div>
        </div>

        <div className="px-5 sm:px-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="py-2 pr-3 font-semibold">Désignation</th>
                  <th className="py-2 px-2 text-right font-semibold">Qté</th>
                  <th className="py-2 px-2 font-semibold">Unité</th>
                  <th className="py-2 px-2 text-right font-semibold">PU HT</th>
                  <th className="py-2 px-2 text-right font-semibold">TVA</th>
                  <th className="py-2 pl-2 text-right font-semibold">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, idx) => (
                  <tr
                    key={l.id ?? `l-${idx}`}
                    className="border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <td className="py-3 pr-3 align-top text-slate-900 dark:text-slate-100">{l.designation}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{l.quantite}</td>
                    <td className="py-3 px-2 text-slate-700 dark:text-slate-300">{l.unite}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrencyEUR(l.prix_ht)}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{l.tva} %</td>
                    <td className="py-3 pl-2 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrencyEUR(ligneTotalHt({ quantite: l.quantite, prix_ht: l.prix_ht }))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onEditLines}
              className={cx(focusRing, "text-sm font-medium text-[color:var(--primary)] hover:underline")}
            >
              Modifier les lignes
            </button>
            <div className="space-y-1 text-right text-sm">
              <p className="text-slate-600 dark:text-slate-400">Total HT : {formatCurrencyEUR(totals.total_ht)}</p>
              <p className="text-slate-600 dark:text-slate-400">Total TVA : {formatCurrencyEUR(totals.total_tva)}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Total TTC : {formatCurrencyEUR(totals.total_ttc)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 px-5 py-5 sm:px-8 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes & conditions (visibles client)</p>
          <textarea
            rows={3}
            className={cx(fieldClass, "mt-2 w-full resize-none text-sm leading-relaxed text-slate-700 dark:text-slate-300")}
            placeholder="Délais, conditions de paiement…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
          {profile.mention_legale?.trim() ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{profile.mention_legale}</p>
          ) : null}
          {profile.conditions_paiement?.trim() ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{profile.conditions_paiement}</p>
          ) : null}
        </div>

        {onSend ? (
          <div className="border-t border-slate-100 px-5 py-4 sm:px-8 dark:border-slate-800 md:hidden">
            <button
              type="button"
              onClick={onSend}
              className={cx(
                focusRing,
                "h-11 w-full rounded-full bg-[color:var(--primary)] text-sm font-semibold text-white hover:opacity-95",
              )}
            >
              Envoyer le devis
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
