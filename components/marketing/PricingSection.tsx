"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

import { MARKETING_PLANS } from "@/components/marketing/marketing-data";
import { APP_NAME } from "@/lib/app-branding";
import { flowoSegmentTabClass } from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 text-center md:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--primary)]">Tarifs {APP_NAME}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          14 jours d&apos;essai gratuit · Toutes fonctionnalités · Sans carte bancaire
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className={flowoSegmentTabClass(!yearly)} onClick={() => setYearly(false)}>
            Mensuel
          </button>
          <button type="button" className={flowoSegmentTabClass(yearly)} onClick={() => setYearly(true)}>
            Annuel
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {MARKETING_PLANS.map((plan) => {
            const price = yearly ? plan.yearlyEur : plan.monthlyEur;
            const params = new URLSearchParams({ plan: plan.id, billing: yearly ? "yearly" : "monthly" });
            return (
              <div
                key={plan.id}
                className={cx(
                  "flex flex-col rounded-2xl border bg-white p-6 text-left shadow-sm dark:bg-slate-900",
                  plan.popular
                    ? "border-[color:var(--primary)]/35 ring-1 ring-[color:var(--primary)]/20"
                    : "border-slate-200/90 dark:border-slate-700",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <span className="rounded-full border border-[color:var(--primary)]/20 bg-[color:var(--primary)]/5 px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--primary)]">
                    {plan.badge}
                  </span>
                </div>
                <p className="mt-3 text-4xl font-extrabold">
                  {price}€ <span className="text-base font-semibold text-slate-500">HT /{yearly ? "an" : "mois"}</span>
                </p>
                {plan.id === "pro_plus" ? (
                  <span className="mt-3 inline-block rounded-full border border-yellow-300 bg-yellow-100 px-3 py-0.5 text-xs font-semibold text-yellow-800">
                    ⚡ Conforme facturation électronique 2026
                  </span>
                ) : null}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
                <Link
                  href={`/register?${params.toString()}`}
                  className={cx(
                    focusRing,
                    "mt-6 block rounded-xl px-4 py-3.5 text-center text-base font-semibold transition",
                    plan.popular
                      ? "bg-[color:var(--primary)] text-white shadow-md hover:opacity-95"
                      : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
                  )}
                >
                  Démarrer l&apos;essai gratuit
                </Link>
                <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-sm font-semibold">{plan.includesLabel}</p>
                  <ul className="mt-3 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}
