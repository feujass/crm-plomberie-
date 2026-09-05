"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/utils";
import { flowoSegmentTabClass } from "@/lib/flowo-ui";
import type { FlowoBilling, FlowoPlanId } from "@/lib/stripe/plans";

type PlanId = FlowoPlanId;
type Billing = "mensuel" | "annuel";

type Plan = {
  id: PlanId;
  label: string;
  tagline: string;
  includedBadge: string;
  features: string[];
  monthlyEur: number;
  yearlyEur: number;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "pro",
    label: "Pro",
    tagline: "L’essentiel pour faire vos devis vite.",
    includedBadge: "Pour démarrer",
    monthlyEur: 25,
    yearlyEur: 240,
    features: [
      "Zeus IA : 10 devis vocaux/mois",
      "Catalogue : 30 prix personnalisés",
      "Envoi client + statuts",
      "Relances simples",
    ],
  },
  {
    id: "pro_plus",
    label: "Pro+",
    tagline: "IA + suivi pour gagner du temps chaque jour.",
    includedBadge: "Recommandé",
    monthlyEur: 30,
    yearlyEur: 300,
    highlight: true,
    features: [
      "Inclut tout le plan Pro",
      "Zeus IA : 50 devis vocaux/mois",
      "Catalogue illimité (prix personnalisés)",
      "Préparation pour facturation électronique",
      "Suivi des paiements clients",
    ],
  },
  {
    id: "pme",
    label: "PME",
    tagline: "Pour les équipes et le pilotage.",
    includedBadge: "Équipe",
    monthlyEur: 49,
    yearlyEur: 492,
    features: [
      "Inclut tout Pro+",
      "Zeus IA : 100 devis vocaux/mois",
      "Plusieurs collaborateurs — prochaine mise à jour",
      "Rentabilité & tableaux de bord",
    ],
  },
];

function formatEur(n: number) {
  return `${n}€`;
}

function toStripeBilling(billing: Billing): FlowoBilling {
  return billing === "annuel" ? "yearly" : "monthly";
}

export function CompteAbonnementClient() {
  const [planId, setPlanId] = useState<PlanId>("pro_plus");
  const [billing, setBilling] = useState<Billing>("annuel");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activePlan = useMemo(() => PLANS.find((p) => p.id === planId) ?? PLANS[0], [planId]);
  const price = billing === "mensuel" ? activePlan.monthlyEur : Math.round(activePlan.yearlyEur / 12);
  const suffix = billing === "mensuel" ? "/mois" : "/mois";
  const yearlyLine = billing === "annuel" ? `${formatEur(activePlan.yearlyEur)} / an` : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Choisissez votre abonnement</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Paiement via page sécurisée. Vous pouvez changer d’offre à tout moment.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-full bg-[var(--muted)] p-1">
        {(["pro", "pro_plus", "pme"] as PlanId[]).map((id) => {
          const p = PLANS.find((x) => x.id === id)!;
          const active = planId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlanId(id)}
              className={cx(
                "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition",
                active ? "bg-white text-[var(--foreground)] shadow-sm dark:bg-gray-950" : "text-gray-600 dark:text-gray-300",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-[color:var(--primary)]/15 bg-[color:var(--primary)]/5 p-4 dark:border-white/10 dark:bg-[color:var(--primary)]/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[var(--foreground)]">{activePlan.label}</span>
              <span className="inline-flex rounded-full border border-[color:var(--primary)]/25 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--primary)] dark:bg-gray-950/40">
                {activePlan.includedBadge}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{activePlan.tagline}</p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-extrabold text-[var(--foreground)]">
              {formatEur(price)} <span className="text-base font-semibold text-gray-600 dark:text-gray-400">HT {suffix}</span>
            </p>
            {yearlyLine ? <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{yearlyLine}</p> : null}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" className={flowoSegmentTabClass(billing === "mensuel", { compact: true })} onClick={() => setBilling("mensuel")}>
            Mensuel
          </button>
          <button type="button" className={flowoSegmentTabClass(billing === "annuel", { compact: true })} onClick={() => setBilling("annuel")}>
            Annuel
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {activePlan.features.map((f) => (
            <div key={f} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-white text-[color:var(--primary)] shadow-sm dark:bg-gray-950">
                <Check className="size-3.5" aria-hidden />
              </span>
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          {err ? <p className="w-full text-sm text-red-600 dark:text-red-400">{err}</p> : null}
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={busy}
            isLoading={busy}
            loadingText="Redirection…"
            onClick={async () => {
              setErr(null);
              setBusy(true);
              try {
                const res = await fetch("/api/stripe/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "same-origin",
                  body: JSON.stringify({ planId, billing: toStripeBilling(billing) }),
                });
                const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
                if (!res.ok) throw new Error(body.message || "Impossible d'ouvrir le paiement Stripe");
                if (!body.url) throw new Error("Réponse Stripe sans URL");
                window.location.href = body.url;
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Stripe indisponible");
                setBusy(false);
              }
            }}
          >
            Continuer
          </Button>
        </div>
      </div>
    </section>
  );
}

