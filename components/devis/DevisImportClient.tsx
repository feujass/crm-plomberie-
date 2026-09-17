"use client";

import { Button } from "@/components/ui/Button";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { Input } from "@/components/ui/Input";
import { createClientFromIa } from "@/lib/devis/resolve-ia-client";
import { DEVIS_IMPORT_CSV_TEMPLATE } from "@/lib/devis/import-csv";
import type { DevisIaClient } from "@/lib/schemas/devis-ia";
import { flowoSegmentTabClass } from "@/lib/flowo-ui";
import type { BackendClient } from "@/types/backend";
import { cx, focusRing } from "@/lib/utils";
import { handleTrialExpiredPaywallResponse } from "@/lib/plans/paywall";
import { Download, FileUp, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type ImportTab = "pdf" | "csv";

export function DevisImportClient({ clients }: { clients: BackendClient[] }) {
  const [tab, setTab] = useState<ImportTab>("pdf");
  const [clientId, setClientId] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  function downloadTemplate() {
    const blob = new Blob([DEVIS_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-import-devis-flowo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importPdfOrImage(file: File) {
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/devis/vision", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      lignes?: unknown[];
      adresse_chantier?: string | null;
      client?: DevisIaClient;
      notes?: string | null;
      date_expiration?: string | null;
    };
    if (!res.ok) {
      if (handleTrialExpiredPaywallResponse(res.status, json)) return;
      throw new Error(json.message || "Analyse impossible");
    }

    const resolvedClientId = await createClientFromIa({
      existingClientId: clientId || null,
      iaClient: json.client,
    });

    const cre = await fetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        mode: "from_ia",
        client_id: resolvedClientId,
        adresse_chantier: json.adresse_chantier?.trim() || null,
        notes: json.notes?.trim() || "Import PDF / photo",
        date_expiration: json.date_expiration || null,
        lignes: json.lignes ?? [],
      }),
    });
    const created = (await cre.json().catch(() => ({}))) as { id?: string; message?: string; code?: string };
    if (!cre.ok) {
      if (handleTrialExpiredPaywallResponse(cre.status, created)) return;
      throw new Error(created.message || "Création du devis");
    }
    if (!created.id) throw new Error("Réponse serveur invalide");
    window.location.assign(`/devis/${encodeURIComponent(created.id)}?view=preview`);
  }

  async function importCsv(file: File) {
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    if (clientId) fd.append("client_id", clientId);
    const res = await fetch("/api/devis/import-csv", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string; code?: string; lignes?: number };
    if (!res.ok) {
      if (handleTrialExpiredPaywallResponse(res.status, json)) return;
      throw new Error(json.message || "Import CSV impossible");
    }
    if (!json.id) throw new Error("Réponse serveur invalide");
    window.location.assign(`/devis/${encodeURIComponent(json.id)}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-8">
      <header>
        <CircleBackLink href="/devis" label="Retour aux devis" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          Importer un ancien devis
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Photo, PDF scanné ou fichier CSV exporté depuis Excel / votre ancien logiciel.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-6">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          <span className="mb-1.5 block text-[var(--muted-foreground)]">Client (optionnel)</span>
          <select
            className="w-full rounded-2xl border border-slate-200/55 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800/88"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">— Sans client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
              </option>
            ))}
          </select>
        </label>
        {selectedClient ? (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">Devis lié à {selectedClient.prenom ?? ""} {selectedClient.nom}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={cx(focusRing, flowoSegmentTabClass(tab === "pdf", { compact: true }))} onClick={() => setTab("pdf")}>
            PDF / Photo
          </button>
          <button type="button" className={cx(focusRing, flowoSegmentTabClass(tab === "csv", { compact: true }))} onClick={() => setTab("csv")}>
            Fichier CSV
          </button>
        </div>

        {err ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        ) : null}

        {tab === "pdf" ? (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = (e.target as HTMLFormElement).elements.namedItem("file") as HTMLInputElement;
              const file = f.files?.[0];
              if (!file) {
                setErr("Choisissez un PDF ou une photo.");
                return;
              }
              start(async () => {
                try {
                  await importPdfOrImage(file);
                } catch (ex) {
                  setErr(ex instanceof Error ? ex.message : "Erreur");
                }
              });
            }}
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              Zeus lit votre document et recrée les lignes du devis automatiquement.
            </p>
            <Input
              label="PDF ou image"
              name="file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFileLabel(e.target.files?.[0]?.name ?? null)}
            />
            {fileLabel ? <p className="text-xs text-[var(--muted-foreground)]">{fileLabel}</p> : null}
            <Button type="submit" disabled={busy} isLoading={busy} loadingText="Analyse…" className="h-12 w-full rounded-full !bg-[color:var(--primary)] !text-white">
              <FileText className="mr-2 size-5" aria-hidden />
              Importer et ouvrir le devis
            </Button>
          </form>
        ) : null}

        {tab === "csv" ? (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = (e.target as HTMLFormElement).elements.namedItem("csv") as HTMLInputElement;
              const file = f.files?.[0];
              if (!file) {
                setErr("Choisissez un fichier CSV.");
                return;
              }
              start(async () => {
                try {
                  await importCsv(file);
                } catch (ex) {
                  setErr(ex instanceof Error ? ex.message : "Erreur");
                }
              });
            }}
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              Colonnes : designation, quantite, unite, prix_ht, tva, section (séparateur ; ou ,).
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--primary)] hover:underline"
            >
              <Download className="size-4" aria-hidden />
              Télécharger le modèle CSV
            </button>
            <Input label="Fichier CSV" name="csv" type="file" accept=".csv,text/csv" onChange={(e) => setFileLabel(e.target.files?.[0]?.name ?? null)} />
            {fileLabel ? <p className="text-xs text-[var(--muted-foreground)]">{fileLabel}</p> : null}
            <Button type="submit" disabled={busy} isLoading={busy} loadingText="Import…" className="h-12 w-full rounded-full !bg-[color:var(--primary)] !text-white">
              <FileUp className="mr-2 size-5" aria-hidden />
              Importer le CSV
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
