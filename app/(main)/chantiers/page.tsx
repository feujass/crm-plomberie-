import { ChantiersRenatoCards } from "@/components/chantiers/ChantiersRenatoCards";
import { backendFetch } from "@/lib/backend/server";
import { isChantierInTermineListSegment } from "@/lib/chantier";
import { FLOWO_SEARCH_INPUT_CLASS, flowoSegmentTabClass } from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";
import type { BackendClient } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";
import { Search } from "lucide-react";
import Link from "next/link";

type ChantiersPageSearch = { q?: string; segment?: string };

const SEGMENTS = ["en_cours", "termine"] as const;
const SEGMENT_LABEL: Record<(typeof SEGMENTS)[number], string> = {
  en_cours: "En cours",
  termine: "Terminé",
};

function buildChantiersHref(segment: string, q: string) {
  const p = new URLSearchParams();
  p.set("segment", segment);
  if (q.trim()) p.set("q", q.trim());
  const s = p.toString();
  return s ? `/chantiers?${s}` : "/chantiers";
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeChantierAlerts(rows: Chantier[]) {
  const items: { id: string; chantierId: string; type: "warning" | "danger"; message: string }[] = [];
  const today = todayMidnight();
  for (const p of rows) {
    if (isChantierInTermineListSegment(p)) continue;
    if (p.a_relancer) {
      items.push({ id: `rel-${p.id}`, chantierId: p.id, type: "danger", message: `À relancer · ${p.name}` });
    }
    if (p.due_date) {
      const due = new Date(`${p.due_date}T12:00:00`);
      const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      if (diff >= 0 && diff <= 7) {
        items.push({
          id: `due-${p.id}`,
          chantierId: p.id,
          type: "warning",
          message: `Échéance ${diff <= 0 ? "aujourd'hui" : `dans ${diff} j`} · ${p.name}`,
        });
      }
    }
  }
  return items;
}

export default async function ChantiersPage({ searchParams }: { searchParams: Promise<ChantiersPageSearch> }) {
  const sp = await searchParams;
  const rawSeg = sp.segment?.trim() ?? "";
  const segment: (typeof SEGMENTS)[number] = SEGMENTS.includes(rawSeg as (typeof SEGMENTS)[number])
    ? (rawSeg as (typeof SEGMENTS)[number])
    : "en_cours";
  const q = sp.q?.trim() ?? "";

  const qs = new URLSearchParams();
  if (q) qs.set("search", q);

  const [allRows, clients] = await Promise.all([
    backendFetch(`/api/chantiers?${qs.toString()}`).catch(() => []) as Promise<Chantier[]>,
    backendFetch("/api/clients").catch(() => []) as Promise<BackendClient[]>,
  ]);

  const filtered = (allRows ?? []).filter((c) =>
    segment === "termine" ? isChantierInTermineListSegment(c) : !isChantierInTermineListSegment(c),
  );

  const sorted = [...filtered].sort((a, b) => {
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    return db - da;
  });

  const clientAddresses: Record<string, string> = {};
  const clientNames: Record<string, string> = {};
  for (const c of clients ?? []) {
    const id = String(c.id);
    const addr = c.adresse?.trim();
    if (addr) clientAddresses[id] = addr;
    clientNames[id] = [c.prenom, c.nom].filter(Boolean).join(" ").trim() || c.nom;
  }

  const alertes = computeChantierAlerts(allRows ?? []);

  return (
    <div className="space-y-5 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          Suivi de vos chantiers
        </h1>
        <Link
          href="/chantiers/nouveau"
          className={cx(
            "rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95",
            focusRing,
          )}
        >
          Nouveau chantier
        </Link>
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
              href={buildChantiersHref(key, q)}
              className={cx(focusRing, flowoSegmentTabClass(active))}
            >
              {SEGMENT_LABEL[key]}
            </Link>
          );
        })}
      </div>

      {alertes.length ? (
        <div className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Alertes</h2>
          <div className="flex flex-col gap-2">
            {alertes.map((a) => (
              <Link
                key={a.id}
                href={`/chantiers/${a.chantierId}`}
                className={cx(
                  "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition hover:opacity-90",
                  a.type === "danger"
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
                    : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
                  focusRing,
                )}
              >
                {a.message}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <ChantiersRenatoCards
        chantiers={sorted}
        clientAddresses={clientAddresses}
        clientNames={clientNames}
        listSegment={segment}
      />
    </div>
  );
}
