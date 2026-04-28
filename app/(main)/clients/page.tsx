import { Card } from "@/components/ui/Card";
import { backendFetch } from "@/lib/backend/server";
import Link from "next/link";
import type { BackendClient } from "@/types/backend";

type Search = { q?: string; type?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.type?.trim()) qs.set("type", sp.type.trim());
  if (sp.q?.trim()) qs.set("search", sp.q.trim());
  const rows = (await backendFetch(`/api/clients?${qs.toString()}`)) as BackendClient[];
  const sorted = [...(rows ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/clients/nouveau" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white">
          Nouveau client
        </Link>
      </div>
      <Card>
        <form method="get" className="flex flex-wrap gap-2">
          <input
            name="q"
            placeholder="Recherche…"
            defaultValue={sp.q}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <select
            name="type"
            defaultValue={sp.type || ""}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Tous types</option>
            <option value="particulier">Particulier</option>
            <option value="professionnel">Professionnel</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
            Filtrer
          </button>
        </form>
      </Card>
      <ul className="space-y-2">
        {sorted.map((c) => (
          <li key={c.id}>
            <Link href={`/clients/${c.id}`} className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span className="font-medium text-sky-700">{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</span>
              {c.inactive ? <span className="ml-2 text-xs text-amber-700">Inactif</span> : <span className="ml-2 text-xs text-emerald-700">Actif</span>}
              <p className="text-sm text-slate-500">{c.email || "—"} · {c.tel || "—"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
