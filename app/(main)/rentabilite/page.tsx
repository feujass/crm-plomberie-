"use client";

import { BarChart } from "@/components/charts/BarChart";
import { ComboChart } from "@/components/charts/ComboChart";
import { Card } from "@/components/ui/Card";
import { formatCurrencyEUR } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";

type Kpis = {
  caMois: number;
  caMoisPrec: number;
  devisCrees: number;
  devisEnvoyes: number;
  devisAcceptes: number;
  devisRefuses: number;
  montantMoyenDevis: number;
  impayes: number;
  monthly: { mois: string; ca: number }[];
  pie: { name: string; value: number }[];
};

export default function RentabilitePage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    void fetch("/api/dashboard/rentabilite", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Kpis>;
      })
      .then(setKpis)
      .catch(() => setKpis(null));
  }, []);

  const comboData = useMemo(() => {
    const m = kpis?.monthly ?? [];
    return m.map((row, i, arr) => {
      const from = Math.max(0, i - 2);
      const slice = arr.slice(from, i + 1);
      const tendance = slice.reduce((s, x) => s + x.ca, 0) / slice.length;
      return { ...row, tendance: Math.round(tendance * 100) / 100 };
    });
  }, [kpis?.monthly]);

  if (!kpis) {
    return (
      <p className="text-slate-600 dark:text-slate-300">
        Chargement des indicateurs… Si rien ne s&apos;affiche, vérifiez que le backend est démarré et que vous êtes
        connecté.
      </p>
    );
  }

  const currencyAxis = (v: number) => formatCurrencyEUR(v);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rentabilité</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="CA mois en cours">
          <p className="text-xl font-semibold">{formatCurrencyEUR(kpis.caMois)}</p>
        </Card>
        <Card title="Montant moyen devis">
          <p className="text-xl font-semibold">{formatCurrencyEUR(kpis.montantMoyenDevis)}</p>
        </Card>
        <Card title="Devis créés / envoyés / acceptés / refusés">
          <p className="text-sm">
            {kpis.devisCrees} / {kpis.devisEnvoyes} / {kpis.devisAcceptes} / {kpis.devisRefuses}
          </p>
        </Card>
        <Card title="Conversion devis → accepté">
          <p className="text-xl font-semibold">
            {kpis.devisEnvoyes ? Math.round((kpis.devisAcceptes / kpis.devisEnvoyes) * 100) : 0}%
          </p>
        </Card>
      </div>

      <Card title="CA mensuel (Tremor BarChart)">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          Devis acceptés ou facturés, par mois de création — même source que l&apos;accueil.
        </p>
        <BarChart
          data={kpis.monthly}
          index="mois"
          categories={["ca"]}
          colors={["blue"]}
          valueFormatter={currencyAxis}
          yAxisWidth={64}
          xAxisLabel="Mois"
          yAxisLabel="CA"
        />
      </Card>

      <Card title="CA et tendance (Tremor ComboChart)">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          Barres : CA du mois. Courbe : moyenne mobile sur 3 mois (aperçu de tendance).
        </p>
        <ComboChart
          data={comboData}
          index="mois"
          enableBiaxial
          xAxisLabel="Mois"
          barSeries={{
            categories: ["ca"],
            colors: ["blue"],
            valueFormatter: currencyAxis,
            yAxisLabel: "CA",
            yAxisWidth: 64,
          }}
          lineSeries={{
            categories: ["tendance"],
            colors: ["amber"],
            valueFormatter: currencyAxis,
            yAxisLabel: "Moy. 3 mois",
            yAxisWidth: 64,
          }}
        />
      </Card>
    </div>
  );
}
