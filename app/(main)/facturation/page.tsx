import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import Link from "next/link";
import type { BackendFacture } from "@/types/backend";

export default async function FacturationPage() {
  const rows = (await backendFetch("/api/factures")) as BackendFacture[];
  const sorted = [...(rows ?? [])].sort((a, b) => {
    const da = a.date_emission ? Date.parse(a.date_emission) : 0;
    const db = b.date_emission ? Date.parse(b.date_emission) : 0;
    return db - da;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Facturation</h1>
        <div className="flex gap-2">
          <a
            href="/api/factures/export-csv"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            Export CSV
          </a>
        </div>
      </div>
      <p className="text-sm text-slate-600">Créez une facture depuis un devis accepté (bouton Facturer sur le devis).</p>
      <Card>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((f) => {
            const nom = f.client_nom?.trim() || "—";
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/facturation/${f.id}`} className="font-medium text-sky-700 hover:underline">
                  {f.numero}
                </Link>
                <span className="text-sm text-slate-600">{nom}</span>
                <Badge statut={f.statut ?? "—"} />
                <span>{formatCurrencyEUR(Number(f.total_ttc))}</span>
                <span className="text-xs text-slate-400">{formatDateFr(f.date_emission)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
