import { FactureConformiteClient } from "@/components/facturation/FactureConformiteClient";
import { FacturePaiementFormClient } from "@/components/facturation/FacturePaiementFormClient";
import { FacturePublicLinkBlock } from "@/components/facturation/FacturePublicLinkBlock";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { backendFetch } from "@/lib/backend/server";
import { requireFeature } from "@/lib/plans/require-feature";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import { notFound } from "next/navigation";
import type { BackendFactureDetail, BackendTransmission } from "@/types/backend";

type Props = { params: Promise<{ id: string }> };

export default async function FactureDetailPage({ params }: Props) {
  await requireFeature("facturation");
  const { id } = await params;
  let facture: BackendFactureDetail | null = null;
  try {
    facture = (await backendFetch(`/api/factures/${id}`)) as BackendFactureDetail;
  } catch {
    facture = null;
  }
  if (!facture) notFound();

  let transmissions: BackendTransmission[] = [];
  try {
    transmissions = (await backendFetch(`/api/factures/${id}/transmissions`)) as BackendTransmission[];
  } catch {
    transmissions = [];
  }

  const pays = facture.paiements ?? [];
  const sumPay = pays.reduce((s, p) => s + Number(p.montant || 0), 0);
  const storedTtc = Number(facture.total_ttc ?? 0);
  const storedHt = Number(facture.total_ht ?? 0);
  const storedTva = Number(facture.total_tva ?? 0);

  const lignes = (facture.lignes ?? []).slice();
  const computed = lignes.reduce(
    (acc, l) => {
      const q = Number(l.quantite ?? 1);
      const pu = Number(l.prix_ht ?? 0);
      const htFromLine = typeof l.total_ht === "number" ? Number(l.total_ht) : q * pu;
      const ht = Number.isFinite(htFromLine) ? htFromLine : 0;
      const tvaRate = Number(l.tva ?? 0);
      const tva = ht * (tvaRate / 100);
      return { total_ht: acc.total_ht + ht, total_tva: acc.total_tva + tva };
    },
    { total_ht: 0, total_tva: 0 },
  );
  const computedHt = Math.round(computed.total_ht * 100) / 100;
  const computedTva = Math.round(computed.total_tva * 100) / 100;
  const computedTtc = Math.round((computedHt + computedTva) * 100) / 100;
  const ttc = computedTtc || storedTtc;
  const solde = Math.max(0, ttc - sumPay);
  const mismatch =
    Math.abs((storedTtc || 0) - (computedTtc || 0)) > 0.01 &&
    (storedTtc || 0) > 0 &&
    (computedTtc || 0) > 0;
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const publicToken = facture.public_token?.trim();
  const publicUrl = publicToken ? `${siteBase}/f/${publicToken}` : "";

  return (
    <div className="space-y-4">
      <CircleBackLink href="/facturation" label="Retour aux factures" />
      <h1 className="text-2xl font-bold">
        {facture.numero} <Badge statut={facture.statut ?? "—"} />
      </h1>
      <p className="text-sm text-slate-600">
        Émission {formatDateFr(facture.date_emission)} — Échéance {formatDateFr(facture.date_echeance)}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/factures/${encodeURIComponent(id)}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Télécharger PDF facture
        </a>
      </div>
      {mismatch ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
          Attention : le total stocké de la facture ({formatCurrencyEUR(storedTtc)}) ne correspond pas au total recalculé à partir des lignes ({formatCurrencyEUR(computedTtc)}).
        </div>
      ) : null}
      {publicUrl ? <FacturePublicLinkBlock publicUrl={publicUrl} /> : null}

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 dark:text-slate-100">
          Conformité (avancé)
          <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">PDP / Chorus / transmissions</span>
        </summary>
        <div className="mt-3">
          <FactureConformiteClient
            factureId={id}
            factureNumero={facture.numero}
            totalTtc={Number(facture.total_ttc ?? 0)}
            dateEmission={facture.date_emission}
            branche={facture.conformite_branche}
            warnings={facture.conformite_warnings}
            initialTransmissions={Array.isArray(transmissions) ? transmissions : []}
          />
        </div>
      </details>

      <Card>
        <div className="mb-3 flex items-end justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-card-foreground">Lignes</h2>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Détail du calcul</span>
        </div>
        {/* Mobile: affichage en blocs (plus lisible qu'un tableau compressé) */}
        <div className="sm:hidden">
          {lignes.map((l, idx) => {
            const q = Number(l.quantite ?? 1);
            const pu = Number(l.prix_ht ?? 0);
            const tvaRate = Number(l.tva ?? 0);
            const totalHt =
              typeof l.total_ht === "number" ? Number(l.total_ht) : q * pu;
            return (
              <div
                key={`${idx}-${l.designation}`}
                className="border-b border-slate-200/70 py-4 last:border-b-0 dark:border-slate-800"
              >
                <p className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">
                  {l.designation}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Qté</span>
                    <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{q}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">TVA</span>
                    <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{tvaRate}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">PU HT</span>
                    <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrencyEUR(pu)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Total HT</span>
                    <span className="tabular-nums text-base font-extrabold text-slate-900 dark:text-slate-50">
                      {formatCurrencyEUR(totalHt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / grands écrans: tableau */}
        <table className="hidden w-full text-left text-sm sm:table">
          <thead className="text-xs text-slate-500 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 font-semibold">Désignation</th>
              <th className="py-2 text-right font-semibold">Qté</th>
              <th className="py-2 text-right font-semibold">PU HT</th>
              <th className="py-2 text-right font-semibold">TVA</th>
              <th className="py-2 text-right font-semibold">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, idx) => (
              <tr key={`${idx}-${l.designation}`} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-2">{l.designation}</td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums">{Number(l.quantite ?? 1)}</td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatCurrencyEUR(Number(l.prix_ht ?? 0))}</td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums">{Number(l.tva ?? 0)}%</td>
                <td className="whitespace-nowrap py-2 text-right tabular-nums">
                  {formatCurrencyEUR(
                    typeof l.total_ht === "number"
                      ? Number(l.total_ht)
                      : Number(l.quantite ?? 1) * Number(l.prix_ht ?? 0),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 border-t border-slate-200 pt-3 text-right text-sm dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Totaux</p>
          <div className="mt-1 space-y-1">
          <p>HT : {formatCurrencyEUR(computedHt || storedHt)}</p>
          <p>TVA : {formatCurrencyEUR(computedTva || storedTva)}</p>
          <p className="text-base font-semibold">TTC : {formatCurrencyEUR(ttc)}</p>
          </div>
        </div>
      </Card>

      <Card title={`Paiements — solde ${formatCurrencyEUR(solde)}`}>
        <ul className="mb-3 text-sm">
          {(pays ?? []).map((p) => (
            <li key={p.id}>
              {formatDateFr(p.date)} — {formatCurrencyEUR(Number(p.montant))} ({p.mode})
            </li>
          ))}
        </ul>
        <FacturePaiementFormClient factureId={id} />
      </Card>
    </div>
  );
}
