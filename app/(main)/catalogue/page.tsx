import { CatalogueOuvrageCard } from "@/components/catalogue/CatalogueOuvrageCard";
import { ImportFromDevisFormClient } from "@/components/catalogue/CatalogueActionForms";
import { backendFetch } from "@/lib/backend/server";
import { FLOWO_EMPTY_LIST_CLASS, FLOWO_SEARCH_INPUT_CLASS, flowoSegmentTabClass } from "@/lib/flowo-ui";
import { cx, focusRing } from "@/lib/utils";
import type { BackendDevis, BackendOuvrage } from "@/types/backend";
import { Info, Plus, Search, Zap } from "lucide-react";
import Link from "next/link";

type CataloguePageSearch = { q?: string; type?: string };

function buildCatalogueHref(opts: { q?: string; type?: string }) {
  const p = new URLSearchParams();
  if (opts.q?.trim()) p.set("q", opts.q.trim());
  const t = opts.type?.trim();
  if (t) p.set("type", t);
  const s = p.toString();
  return s ? `/catalogue?${s}` : "/catalogue";
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<CataloguePageSearch> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.type?.trim()) qs.set("type", sp.type.trim());
  if (sp.q?.trim()) qs.set("search", sp.q.trim());
  const rows = (await backendFetch(`/api/ouvrages?${qs.toString()}`).catch(() => [])) as BackendOuvrage[];
  const sorted = [...(rows ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  const devisList = (await backendFetch("/api/devis").catch(() => [])) as BackendDevis[];
  const devisSelect = (devisList ?? []).slice(0, 80);

  const q = sp.q?.trim() ?? "";
  const typeFilter = sp.type?.trim() ?? "";
  const empty = sorted.length === 0;

  const infoHint =
    "Votre bibliothèque alimente les suggestions et l’assistant lors de la rédaction des devis. Elle se remplit automatiquement à partir de vos devis.";

  return (
    <div className="space-y-5 pb-2">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
            Bibliothèque personnelle
          </h1>
          <span
            className="inline-flex text-slate-400 dark:text-slate-500"
            title={infoHint}
            aria-label={infoHint}
          >
            <Info className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Fournitures, main d&apos;œuvre et ouvrages : Zeus reprend vos prix sur chaque devis.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Ajoutez à la main ou importez depuis un devis existant. Aucun tarif par défaut — la bibliothèque se remplit
          au fil de vos devis.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/catalogue/nouveau?type=fourniture"
            className={cx(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:flex-initial dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
              focusRing,
            )}
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Ajouter une fourniture
          </Link>
          <Link
            href="/catalogue/nouveau"
            className={cx(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:flex-initial",
              focusRing,
            )}
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Ajouter un ouvrage
          </Link>

          <details className="flex-1 sm:min-w-[200px] sm:flex-initial">
            <summary
              className={cx(
                "flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
                focusRing,
                "[&::-webkit-details-marker]:hidden",
              )}
            >
              <Zap className="size-4 text-[color:var(--primary)] dark:text-[color:var(--chart-1)]" aria-hidden />
              Importer
            </summary>
            <div className="mt-3 rounded-xl border border-slate-200/60 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <ImportFromDevisFormClient
                devisSelect={devisSelect}
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
              />
            </div>
          </details>
        </div>

        <hr className="my-6 border-slate-100 dark:border-slate-800" />

        {empty ? (
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Votre bibliothèque est vide pour l&apos;instant. Créez un devis vocal ou ajoutez un ouvrage manuellement —
            vos prix seront enregistrés ici automatiquement.
          </p>
        ) : null}

        <form method="get" className="relative mb-4">
          {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden
          />
          <input
            name="q"
            placeholder="Rechercher dans la bibliothèque…"
            defaultValue={q}
            autoComplete="off"
            className={FLOWO_SEARCH_INPUT_CLASS}
          />
        </form>

        <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Type</span>
          {(["", "main_oeuvre", "fourniture", "ouvrage"] as const).map((t) => {
            const label =
              t === ""
                ? "Tous"
                : t === "main_oeuvre"
                  ? "Main d'œuvre"
                  : t === "fourniture"
                    ? "Fourniture"
                    : "Ouvrage";
            const active = typeFilter === t;
            return (
              <Link
                key={t || "all"}
                href={buildCatalogueHref({ q, type: t })}
                className={cx(focusRing, flowoSegmentTabClass(active, { compact: true }))}
              >
                {label}
              </Link>
            );
          })}
        </form>

        {sorted.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((o) => (
              <li key={o.id}>
                <CatalogueOuvrageCard row={o} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={FLOWO_EMPTY_LIST_CLASS}>
            {empty
              ? "Aucun ouvrage pour l'instant."
              : "Aucun ouvrage ne correspond à votre recherche. Modifiez les filtres ou ajoutez un ouvrage."}
          </p>
        )}
      </section>
    </div>
  );
}
