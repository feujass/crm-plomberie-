import { AccueilLanding } from "@/components/accueil/AccueilLanding";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import type { BackendDashboardStats, BackendMeResponse } from "@/types/backend";
import { greetingDisplayName } from "@/lib/greeting-display-name";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccueilPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = me?.profile ?? {};

  const stats = (await backendFetch("/api/dashboard/stats")) as BackendDashboardStats;
  const totalMois = Number(stats?.devis_du_mois ?? 0);
  const taux = Number(stats?.taux_acceptation ?? 0);
  const caSigne = Number(stats?.ca_mois ?? 0);
  const attente = Number(stats?.montant_attente ?? 0);

  const derniersDevis = stats?.recent_devis ?? [];
  const relancesFiltrees = stats?.relances ?? [];

  const displayName = greetingDisplayName(me);

  return (
    <div className="space-y-8">
      <AccueilLanding displayName={displayName} />

      {profile && Number(profile.onboarding_step ?? 0) < 3 ? (
        <Card title="Prochaines étapes">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Terminez l&apos;onboarding ({Number(profile.onboarding_step ?? 0)}/3).
          </p>
          <Link href="/onboarding" className="mt-2 inline-block text-[color:var(--primary)] hover:underline">
            Continuer
          </Link>
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Votre activité</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Devis du mois">
            <p className="text-2xl font-semibold">{totalMois}</p>
          </Card>
          <Card title="Taux acceptation">
            <p className="text-2xl font-semibold">{taux}%</p>
          </Card>
          <Card title="CA signé (mois)">
            <p className="text-2xl font-semibold">{formatCurrencyEUR(caSigne)}</p>
          </Card>
          <Card title="En attente (envoyés)">
            <p className="text-2xl font-semibold">{formatCurrencyEUR(attente)}</p>
          </Card>
        </div>
      </div>

      {relancesFiltrees.length ? (
        <Card title="Relances à faire">
          <ul className="space-y-2 text-sm">
            {relancesFiltrees.map((d) => (
              <li key={d.id}>
                <Link href={`/devis/${d.id}`} className="text-[color:var(--primary)] hover:underline">
                  {d.numero}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Vos derniers devis">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {(derniersDevis ?? []).map((d) => {
            const nom = d.client_nom || "—";
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/devis/${d.id}`} className="font-medium text-[color:var(--primary)] hover:underline">
                    {d.numero}
                  </Link>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">{nom}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge statut={d.statut ?? "—"} />
                  <span className="text-sm">{formatCurrencyEUR(Number(d.total_ttc))}</span>
                  <span className="text-xs text-slate-400">{d.created_at ? formatDateFr(d.created_at) : "—"}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/devis" className="mt-3 inline-block text-sm text-[color:var(--primary)] hover:underline">
          Voir tous les devis
        </Link>
      </Card>

      <Card title="Chantiers en cours">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Le module « Chantiers » n’est pas encore disponible côté backend FastAPI (Emergent). On peut l’ajouter ensuite.
        </p>
      </Card>
    </div>
  );
}
