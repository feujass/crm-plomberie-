"use client";

import { BarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { formatCurrencyEUR } from "@/lib/format";
import { useEffect, useState } from "react";

type Kpis = {
  monthly: { mois: string; ca: number }[];
};

export function AccueilCaMiniChart() {
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

  if (!kpis?.monthly?.length) return null;

  return (
    <Card title="CA mensuel">
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Devis acceptés ou facturés — 6 derniers mois.</p>
      <BarChart
        data={kpis.monthly}
        index="mois"
        categories={["ca"]}
        colors={["blue"]}
        valueFormatter={(v) => formatCurrencyEUR(v)}
        yAxisWidth={64}
        className="h-48"
      />
    </Card>
  );
}
