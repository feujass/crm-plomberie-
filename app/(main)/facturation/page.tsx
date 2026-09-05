import { FacturesRenatoCards } from "@/components/facturation/FacturesRenatoCards";
import { backendFetch } from "@/lib/backend/server";
import { requireFeature } from "@/lib/plans/require-feature";
import { FLOWO_SEARCH_INPUT_CLASS, flowoSegmentTabClass } from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";
import type { BackendClient, BackendFacture } from "@/types/backend";
import { Search } from "lucide-react";
import Link from "next/link";

type FacturationPageSearch = { q?: string; segment?: string };

const SEGMENTS = ["en_cours", "termine"] as const;
const SEGMENT_LABEL: Record<(typeof SEGMENTS)[number], string> = {
  en_cours: "En cours",
  termine: "Terminé",
};

function buildFacturesHref(segment: string, q: string) {
  const p = new URLSearchParams();
  p.set("segment", segment);
  if (q.trim()) p.set("q", q.trim());
  const s = p.toString();
  return s ? `/facturation?${s}` : "/facturation";
}

const EN_COURS_STATUTS = new Set(["emise", "partiellement_payee"]);

export default async function FacturationPage({ searchParams }: { searchParams: Promise<FacturationPageSearch> }) {
  await requireFeature("facturation");
  const sp = await searchParams;
  const rawSeg = sp.segment?.trim() ?? "";
  const segment: (typeof SEGMENTS)[number] = SEGMENTS.includes(rawSeg as (typeof SEGMENTS)[number])
    ? (rawSeg as (typeof SEGMENTS)[number])
    : "en_cours";
  const q = sp.q?.trim() ?? "";
  const qLower = q.toLowerCase();

  const [allRows, clients] = await Promise.all([
    backendFetch("/api/factures").catch(() => []) as Promise<BackendFacture[]>,
    backendFetch("/api/clients").catch(() => []) as Promise<BackendClient[]>,
  ]);

  let rows = allRows ?? [];
  if (qLower) {
    rows = rows.filter(
      (f) =>
        (f.numero?.toLowerCase().includes(qLower) ?? false) ||
        (f.client_nom?.toLowerCase().includes(qLower) ?? false),
    );
  }

  const filtered = rows.filter((f) => {
    const s = f.statut ?? "";
    if (segment === "termine") return s === "payee";
    return EN_COURS_STATUTS.has(s);
  });

  const sorted = [...filtered].sort((a, b) => {
    const da = a.date_emission ? Date.parse(a.date_emission) : a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.date_emission ? Date.parse(b.date_emission) : b.created_at ? Date.parse(b.created_at) : 0;
    return db - da;
  });

  const clientAddresses: Record<string, string> = {};
  for (const c of clients ?? []) {
    const addr = c.adresse?.trim();
    if (addr) clientAddresses[String(c.id)] = addr;
  }

  return (
    <div className="space-y-5 pb-2">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          Suivi de vos factures
        </h1>
        <div
          className={cx(
            "flex flex-nowrap items-center gap-2 overflow-x-auto",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {(
            [
              { href: "/api/factures/export-csv", short: "CSV", full: "Export CSV" },
              { href: "/api/factures/export-compta", short: "Compta", full: "Export compta" },
              { href: "/api/factures/export-fec", short: "FEC", full: "Export FEC" },
            ] as const
          ).map(({ href, short, full }) => (
            <a
              key={href}
              href={href}
              className={cx(
                "shrink-0 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition",
                "hover:border-slate-300 hover:bg-slate-50/80 hover:text-[color:var(--primary)]",
                "sm:px-4 sm:py-2.5 sm:text-sm",
                "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/75",
                focusRing,
              )}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{full}</span>
            </a>
          ))}
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Créez une facture depuis un devis accepté (bouton Facturer sur le devis).
      </p>

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
              href={buildFacturesHref(key, q)}
              className={cx(focusRing, flowoSegmentTabClass(active))}
            >
              {SEGMENT_LABEL[key]}
            </Link>
          );
        })}
      </div>

      <FacturesRenatoCards factures={sorted} clientAddresses={clientAddresses} listSegment={segment} />
    </div>
  );
}
