import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import Link from "next/link";
import type { BackendDevis } from "@/types/backend";

type Search = { q?: string; statut?: string; tri?: string };

export default async function DevisListPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.statut?.trim()) qs.set("statut", sp.statut.trim());
  if (sp.q?.trim()) qs.set("search", sp.q.trim());
  const rows = (await backendFetch(`/api/devis?${qs.toString()}`)) as BackendDevis[];

  const tri = sp.tri || "date";
  const sorted = [...(rows ?? [])].sort((a, b) => {
    if (tri === "montant") return Number(b.total_ttc ?? 0) - Number(a.total_ttc ?? 0);
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    return db - da;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Devis</h1>
        <Link href="/devis/nouveau" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
          Nouveau devis
        </Link>
      </div>

      <Card>
        <form className="flex flex-wrap gap-2" method="get">
          <input
            name="q"
            placeholder="Recherche numéro…"
            defaultValue={sp.q}
            className="min-w-[160px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <select
            name="statut"
            defaultValue={sp.statut || ""}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Tous statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="envoye">Envoyé</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
            <option value="expire">Expiré</option>
            <option value="archive">Archivé</option>
          </select>
          <select
            name="tri"
            defaultValue={tri}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="date">Tri date</option>
            <option value="montant">Tri montant</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900">
            Filtrer
          </button>
        </form>
      </Card>

      <ul className="space-y-2">
        {sorted.map((d) => {
          const nom = d.client_nom?.trim() || "—";
          return (
            <li key={d.id}>
              <Link href={`/devis/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                <div>
                  <span className="font-semibold text-sky-700">{d.numero}</span>
                  <span className="ml-2 text-sm text-slate-600">{nom}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge statut={d.statut ?? "—"} />
                  <span>{formatCurrencyEUR(Number(d.total_ttc))} TTC</span>
                  <span className="text-xs text-slate-400">{formatDateFr(d.created_at)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
