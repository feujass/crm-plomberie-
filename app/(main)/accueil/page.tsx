import { AccueilLanding } from "@/components/accueil/AccueilLanding";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import type { BackendDashboardStats, BackendMeResponse } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";
import { isChantierInTermineListSegment } from "@/lib/chantier";
import { greetingDisplayName } from "@/lib/greeting-display-name";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccueilPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = me?.profile ?? {};

  const [stats, chantiersRows] = await Promise.all([
    backendFetch("/api/dashboard/stats"),
    backendFetch("/api/chantiers").catch(() => []),
  ]);
  const statsTyped = stats as BackendDashboardStats;

  const chantiersEnCours = (chantiersRows as Chantier[]).filter((c) => !isChantierInTermineListSegment(c));
  const chantiersAccueil = [...chantiersEnCours].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    return db - da;
  });
  const topChantiers = chantiersAccueil.slice(0, 5);
  const totalMois = Number(statsTyped?.devis_du_mois ?? 0);
  const taux = Number(statsTyped?.taux_acceptation ?? 0);
  const caSigne = Number(statsTyped?.ca_mois ?? 0);
  const attente = Number(statsTyped?.montant_attente ?? 0);

  const derniersDevis = statsTyped?.recent_devis ?? [];
  const relancesFiltrees = statsTyped?.relances ?? [];

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
        {topChantiers.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Aucun chantier en cours. Créez-en un depuis l’onglet{" "}
            <Link href="/chantiers" className="text-[color:var(--primary)] hover:underline">
              Chantiers
            </Link>
            .
          </p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {topChantiers.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/chantiers/${c.id}`} className="font-medium text-[color:var(--primary)] hover:underline">
                      {c.name || "Sans nom"}
                    </Link>
                    {c.site_address ? (
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{c.site_address}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {c.status ? <Badge statut={c.status} /> : null}
                    {c.due_date ? (
                      <span className="text-xs text-slate-400">Échéance {formatDateFr(c.due_date)}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/chantiers" className="mt-3 inline-block text-sm text-[color:var(--primary)] hover:underline">
              Voir tous les chantiers
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
