import { backendFetch } from "@/lib/backend/server";
import {
  FLOWO_EMPTY_LIST_CLASS,
  FLOWO_LIST_CARD_CLASS,
  FLOWO_SEARCH_INPUT_CLASS,
  flowoSegmentTabClass,
} from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";
import type { BackendClient } from "@/types/backend";
import { Mail, Phone, Search, User } from "lucide-react";
import Link from "next/link";

type Search = { q?: string; type?: string };

const TYPE_SEGMENTS = ["", "particulier", "professionnel"] as const;
const TYPE_LABEL: Record<(typeof TYPE_SEGMENTS)[number], string> = {
  "": "Tous",
  particulier: "Particulier",
  professionnel: "Professionnel",
};

function buildClientsHref(type: string, q: string) {
  const p = new URLSearchParams();
  if (type) p.set("type", type);
  if (q.trim()) p.set("q", q.trim());
  const s = p.toString();
  return s ? `/clients?${s}` : "/clients";
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const rawType = sp.type?.trim() ?? "";
  const type: (typeof TYPE_SEGMENTS)[number] = TYPE_SEGMENTS.includes(rawType as (typeof TYPE_SEGMENTS)[number])
    ? (rawType as (typeof TYPE_SEGMENTS)[number])
    : "";
  const q = sp.q?.trim() ?? "";

  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (q) qs.set("search", q);

  const rows = (await backendFetch(`/api/clients?${qs.toString()}`)) as BackendClient[];
  const sorted = [...(rows ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  return (
    <div className="space-y-5 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          Clients
        </h1>
        <Link
          href="/clients/nouveau"
          className={cx(
            "rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95",
            focusRing,
          )}
        >
          Nouveau client
        </Link>
      </div>

      <form method="get" className="relative">
        <input type="hidden" name="type" value={type} />
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          aria-hidden
        />
        <input
          name="q"
          placeholder="Rechercher…"
          defaultValue={q}
          autoComplete="off"
          className={FLOWO_SEARCH_INPUT_CLASS}
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {TYPE_SEGMENTS.map((key) => {
          const active = type === key;
          return (
            <Link key={key || "all"} href={buildClientsHref(key, q)} className={cx(focusRing, flowoSegmentTabClass(active))}>
              {TYPE_LABEL[key]}
            </Link>
          );
        })}
      </div>

      {!sorted.length ? (
        <p className={FLOWO_EMPTY_LIST_CLASS}>
          Aucun client trouvé. Modifiez la recherche ou ajoutez un nouveau client.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sorted.map((c) => {
            const name = c.prenom ? `${c.prenom} ${c.nom}` : c.nom;
            return (
              <li key={c.id} className={FLOWO_LIST_CARD_CLASS}>
                <Link href={`/clients/${c.id}`} className={cx("block p-4 transition hover:opacity-[0.98]", focusRing)}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{name}</h2>
                    {c.inactive ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                        Inactif
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        Actif
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{c.email || "—"}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Phone className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{c.tel || "—"}</span>
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs font-medium capitalize text-[color:var(--primary)]">
                    <User className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    {c.type || "particulier"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
