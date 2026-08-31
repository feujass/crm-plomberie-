import { cx } from "@/lib/utils";

/** Champ recherche des listes (mode clair très léger, proche Renato). */
export const FLOWO_SEARCH_INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200/55 bg-white py-3 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[color:var(--primary)]/35 focus:ring-1 focus:ring-[color:var(--primary)]/12 md:text-sm dark:border-slate-600 dark:bg-slate-800/88 dark:text-slate-100 dark:placeholder:text-slate-500";

/** Onglets En cours / Terminé (inactif = bord gris léger, pas bloc gris foncé). */
export function flowoSegmentTabClass(active: boolean, opts?: { compact?: boolean }) {
  const size = opts?.compact
    ? "px-3 py-1.5 text-xs font-semibold sm:text-sm"
    : "px-4 py-2 text-sm font-semibold";
  return cx(
    "rounded-full border transition",
    size,
    active
      ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-sm"
      : "border-slate-200/90 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300/90 hover:bg-slate-50/70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/75",
  );
}

/** Liste vide type « dashed » — lisible sur fond page clair (#fafafa). */
export const FLOWO_EMPTY_LIST_CLASS =
  "rounded-2xl border border-dashed border-slate-300/90 bg-slate-50 px-4 py-10 text-center text-sm font-medium leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-900/45 dark:text-slate-300";

/** Carte liste (devis / chantiers / factures). */
export const FLOWO_LIST_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-slate-200/75 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900";

/** Zone hero carte avant image / dégradé (mode clair). */
export const FLOWO_CARD_HERO_SURFACE_CLASS = "bg-neutral-50 dark:bg-slate-800";

/** Dégradé de fond quand pas d’image (adouci). */
export const FLOWO_CARD_HERO_GRADIENT_CLASS =
  "absolute inset-0 bg-gradient-to-br from-[color:var(--primary)]/12 via-white to-slate-50/90 dark:from-[color:var(--primary)]/20 dark:via-slate-800 dark:to-slate-900";

/** Largeur utile des pages app sur desktop (mobile inchangé). */
export const FLOWO_DESKTOP_CONTENT_CLASS = "mx-auto w-full max-w-5xl xl:max-w-6xl";
