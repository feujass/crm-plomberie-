"use client";

import { Button } from "@/components/ui/Button";
import { CONNECTION_STATUS_COPY } from "@/lib/facturation/pa/connection-copy";
import type { MockScenario } from "@/lib/facturation/pa/mock-fixtures";
import type { ConnectionSnapshot, ProviderId } from "@/lib/facturation/pa/types";
import { formatDateFr } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "verified", label: "Vérifié (prêt à déposer)" },
  { id: "pending_verification", label: "Raccordement en cours (KYB)" },
  { id: "needs_review", label: "Dossier en revue" },
  { id: "failed", label: "Vérification refusée" },
  { id: "token_expired", label: "Jeton expiré" },
  { id: "invoice_rejected", label: "Facture rejetée (dépôt)" },
];

function toneClass(tone: string): string {
  if (tone === "ok") return "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40";
  if (tone === "pending") return "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40";
  if (tone === "warn") return "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40";
  if (tone === "error") return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40";
  return "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900";
}

export function CompteEFacturationClient({
  initialSnapshot,
  providerId,
  oauthError,
  entrepriseNom,
  siren,
}: {
  initialSnapshot: ConnectionSnapshot;
  providerId: ProviderId;
  oauthError?: string | null;
  entrepriseNom?: string | null;
  siren?: string | null;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [scenario, setScenario] = useState<MockScenario>("verified");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(oauthError ?? null);
  const copy = CONNECTION_STATUS_COPY[snapshot.status];
  const real = providerId === "superpdp";
  const connected = snapshot.status === "verified";

  async function connectMock(next: MockScenario) {
    setPending(true);
    setErr(null);
    try {
      const res = await fetch("/api/compte/e-facturation/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: next }),
      });
      const body = (await res.json()) as { snapshot?: ConnectionSnapshot; message?: string };
      if (!res.ok || !body.snapshot) {
        throw new Error(body.message ?? "Connexion impossible");
      }
      setSnapshot(body.snapshot);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 shadow-sm ${toneClass(copy.tone)}`}>
        <p className="font-semibold text-[var(--foreground)]">{copy.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{copy.body}</p>
        {snapshot.lastError ? <p className="mt-2 text-sm text-red-700 dark:text-red-400">{snapshot.lastError}</p> : null}
      </div>

      {real ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-[var(--foreground)]">Raccordement Super PDP</p>
          {connected ? (
            <>
              <p className="mt-2 text-sm text-[var(--foreground)]">
                <span className="font-medium">{entrepriseNom?.trim() || "Votre entreprise"}</span>
                {siren?.trim() ? (
                  <span className="text-gray-600 dark:text-gray-400"> · SIREN {siren.trim()}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {snapshot.connectedAt
                  ? `Raccordée le ${formatDateFr(snapshot.connectedAt)}`
                  : "Entreprise raccordée à la plateforme."}
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-0 text-sm font-normal text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  disabled={pending}
                  onClick={() => {
                    setPending(true);
                    window.location.href = "/api/compte/e-facturation/connect";
                  }}
                >
                  Reconnecter
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Vous serez redirigé vers Super PDP pour autoriser Flowo. Le SIREN et l’e-mail du compte sont
                préremplis quand ils sont connus.
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setPending(true);
                    window.location.href = "/api/compte/e-facturation/connect";
                  }}
                >
                  {snapshot.status === "disconnected" || snapshot.status === "token_expired" || snapshot.status === "failed"
                    ? "Connecter mon entreprise"
                    : "Reconnecter"}
                </Button>
              </div>
            </>
          )}
          {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-[var(--foreground)]">Simuler un raccordement</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Aucun appel vers Super PDP. Le mock sert à valider les écrans KYB et les cas d’échec.
          </p>
          <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="pa-scenario">
            Scénario
          </label>
          <select
            id="pa-scenario"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            value={scenario}
            onChange={(e) => setScenario(e.target.value as MockScenario)}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="mt-3">
            <Button type="button" disabled={pending} isLoading={pending} onClick={() => void connectMock(scenario)}>
              {snapshot.status === "disconnected" ? "Connecter" : "Mettre à jour le raccordement"}
            </Button>
          </div>
          {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        </div>
      )}
    </div>
  );
}
