import Link from "next/link";

import { AccueilCaBars } from "@/components/accueil/AccueilCaBars";
import { formatCurrencyEUR } from "@/lib/format";
import { cx } from "@/lib/utils";
import type { BackendDashboardStats, BackendDevis } from "@/types/backend";

function DevisStatutPill({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    envoye: "border-slate-300 bg-slate-50 text-slate-600",
    accepte: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    brouillon: "border-slate-200 bg-slate-50 text-slate-500",
    refuse: "border-red-200 bg-red-50/80 text-red-700",
    expire: "border-orange-200 bg-orange-50/80 text-orange-800",
  };
  const labels: Record<string, string> = {
    envoye: "Envoyé",
    accepte: "Accepté",
    brouillon: "Brouillon",
    refuse: "Refusé",
    expire: "Expiré",
  };
  const key = statut?.trim() || "brouillon";
  return (
    <span
      className={cx(
        "inline-flex rounded-md border px-2.5 py-1 text-xs font-medium",
        styles[key] ?? styles.brouillon,
      )}
    >
      {labels[key] ?? key.replace(/_/g, " ")}
    </span>
  );
}

function DevisRow({ devis }: { devis: BackendDevis }) {
  const nom = devis.client_nom?.trim() || "—";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-base shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="min-w-0">
        <Link href={`/devis/${devis.id}`} className="font-semibold text-[color:var(--primary)] hover:underline">
          {devis.numero ?? "Devis"}
        </Link>
        <span className="mx-1.5 text-slate-400">·</span>
        <span className="text-slate-600">{nom}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DevisStatutPill statut={devis.statut ?? "brouillon"} />
        <span className="font-semibold tabular-nums">{formatCurrencyEUR(Number(devis.total_ttc ?? 0))}</span>
      </div>
    </div>
  );
}

export function AccueilDashboard({
  stats,
  monthly,
}: {
  stats: BackendDashboardStats;
  monthly: { mois: string; ca: number }[];
}) {
  const kpis = [
    { label: "Devis du mois", value: String(stats.devis_du_mois ?? 0) },
    { label: "Taux acceptation", value: `${Number(stats.taux_acceptation ?? 0)} %` },
    { label: "CA signé (mois)", value: formatCurrencyEUR(Number(stats.ca_mois ?? 0)) },
    { label: "En attente", value: formatCurrencyEUR(Number(stats.montant_attente ?? 0)) },
  ];
  const derniersDevis = stats.recent_devis ?? [];
  const relances = stats.relances ?? [];

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-4"
          >
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)] sm:text-xl">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="lg:col-span-3">
          <AccueilCaBars monthly={monthly} />
        </div>

        <div className="space-y-3 lg:col-span-2">
          <p className="text-base font-semibold text-[var(--foreground)]">Derniers devis</p>
          {derniersDevis.length ? (
            derniersDevis.map((d) => <DevisRow key={d.id} devis={d} />)
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-base text-slate-500">
              Aucun devis pour l&apos;instant.{" "}
              <Link href="/devis/nouveau" className="font-medium text-[color:var(--primary)] hover:underline">
                Créer votre premier devis
              </Link>
            </p>
          )}
          {derniersDevis.length ? (
            <Link href="/devis" className="inline-block text-base font-medium text-[color:var(--primary)] hover:underline">
              Voir tous les devis
            </Link>
          ) : null}
        </div>
      </div>

      {relances.length ? (
        <div className="space-y-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 lg:p-5">
          <p className="text-base font-semibold text-amber-950">Relances à faire</p>
          <ul className="space-y-2 text-base lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2 lg:space-y-0">
            {relances.map((d) => (
              <li key={d.id}>
                <Link href={`/devis/${d.id}`} className="font-medium text-[color:var(--primary)] hover:underline">
                  {d.numero ?? "Devis"} — {d.client_nom ?? "Client"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
