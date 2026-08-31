import { DevisRenatoCards } from "@/components/devis/DevisRenatoCards";
import { backendFetch } from "@/lib/backend/server";
import { FLOWO_SEARCH_INPUT_CLASS, flowoSegmentTabClass } from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";
import type { BackendClient, BackendDevis } from "@/types/backend";
import { Search } from "lucide-react";
import Link from "next/link";

type Search = { q?: string; segment?: string };

const SEGMENTS = ["en_cours", "termine"] as const;
const SEGMENT_LABEL: Record<(typeof SEGMENTS)[number], string> = {
  en_cours: "En cours",
  termine: "Terminé",
};

function buildDevisHref(segment: string, q: string) {
  const p = new URLSearchParams();
  p.set("segment", segment);
  if (q.trim()) p.set("q", q.trim());
  const s = p.toString();
  return s ? `/devis?${s}` : "/devis";
}

export default async function DevisListPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const rawSeg = sp.segment?.trim() ?? "";
  const segment: (typeof SEGMENTS)[number] = SEGMENTS.includes(rawSeg as (typeof SEGMENTS)[number])
    ? (rawSeg as (typeof SEGMENTS)[number])
    : "en_cours";
  const q = sp.q?.trim() ?? "";

  const qs = new URLSearchParams();
  qs.set("segment", segment);
  if (q) qs.set("search", q);

  const [rows, clients] = await Promise.all([
    backendFetch(`/api/devis?${qs.toString()}`).catch(() => []) as Promise<BackendDevis[]>,
    backendFetch("/api/clients").catch(() => []) as Promise<BackendClient[]>,
  ]);

  const sorted = [...(rows ?? [])].sort((a, b) => {
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    return db - da;
  });

  const clientAddresses: Record<string, string> = {};
  for (const c of clients ?? []) {
    const addr = c.adresse?.trim();
    if (addr) clientAddresses[String(c.id)] = addr;
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          Suivi de vos devis
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/devis/import"
            className={cx(
              "rounded-full border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/75",
              focusRing,
            )}
          >
            Importer
          </Link>
          <Link
            href="/devis/nouveau"
            className={cx(
              "rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95",
              focusRing,
            )}
          >
            Nouveau devis
          </Link>
        </div>
      </div>

      <form method="get" className="relative">
        <input type="hidden" name="segment" value={segment} />
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
        {SEGMENTS.map((key) => {
          const active = segment === key;
          return (
            <Link
              key={key}
              href={buildDevisHref(key, q)}
              className={cx(focusRing, flowoSegmentTabClass(active))}
            >
              {SEGMENT_LABEL[key]}
            </Link>
          );
        })}
      </div>

      <DevisRenatoCards devis={sorted} clientAddresses={clientAddresses} listSegment={segment} />
    </div>
  );
}
