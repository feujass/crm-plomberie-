"use client";

import { Check, Handshake, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import type { AffiliateApplicationRow } from "@/lib/affiliate/applications";

const AUDIENCE_LABELS: Record<string, string> = {
  formateur: "Formateur",
  influenceur: "Influenceur",
  fournisseur: "Fournisseur",
  coach: "Coach",
  autre: "Autre",
};

export function AdminAffiliationClient() {
  const [rows, setRows] = useState<AffiliateApplicationRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/admin/affiliate/applications${q}`);
    const json = (await res.json().catch(() => ({}))) as {
      applications?: AffiliateApplicationRow[];
      error?: string;
    };
    if (!res.ok) {
      setError(json.error ?? "Chargement impossible.");
      return;
    }
    setRows(json.applications ?? []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setPendingId(id);
    setError(null);
    const res = await fetch("/api/admin/affiliate/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: id,
        referral_code: codes[id]?.trim() || undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; referral_code?: string };
    setPendingId(null);
    if (!res.ok) {
      setError(json.error ?? "Approbation impossible.");
      return;
    }
    await load();
  }

  async function reject(id: string) {
    setPendingId(id);
    setError(null);
    const res = await fetch("/api/admin/affiliate/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: id }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setPendingId(null);
    if (!res.ok) {
      setError(json.error ?? "Refus impossible.");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <CircleBackLink href="/compte" label="Retour au compte" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">Admin Flowo</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">Candidatures partenaires</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Approuve ou refuse les demandes reçues via{" "}
          <Link href="/affiliation" className="text-[color:var(--primary)] hover:underline">
            /affiliation
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f
                ? "bg-[color:var(--primary)] text-white"
                : "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            {f === "all" ? "Toutes" : f === "pending" ? "En attente" : f === "approved" ? "Approuvées" : "Refusées"}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Aucune candidature pour ce filtre.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {row.display_name} · {row.brand_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {AUDIENCE_LABELS[row.audience_type] ?? row.audience_type}
                    {row.audience_size ? ` · ${row.audience_size}` : ""} · {row.created_at.slice(0, 10)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {row.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{row.pitch}</p>
              {row.website_or_social ? (
                <p className="mt-2 text-xs text-slate-500">{row.website_or_social}</p>
              ) : null}

              {row.status === "pending" ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="Code parrain (optionnel)"
                      name={`code-${row.id}`}
                      placeholder="Auto si vide"
                      value={codes[row.id] ?? ""}
                      onChange={(e) => setCodes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={pendingId === row.id}
                      className="inline-flex items-center gap-1.5"
                      onClick={() => void approve(row.id)}
                    >
                      <Check className="size-4" aria-hidden />
                      Approuver
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pendingId === row.id}
                      className="inline-flex items-center gap-1.5"
                      onClick={() => void reject(row.id)}
                    >
                      <X className="size-4" aria-hidden />
                      Refuser
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
