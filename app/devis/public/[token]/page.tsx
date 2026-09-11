import { PublicDevisDecision } from "@/components/devis/PublicDevisDecision";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { notFound } from "next/navigation";

type PublicDevis = {
  numero?: string;
  client_nom?: string;
  statut?: string;
  peut_repondre?: boolean;
  lignes?: {
    designation: string;
    quantite?: number;
    unite?: string;
    prix_ht?: number;
    tva?: number;
    total_ht?: number;
  }[];
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  date_creation?: string;
  notes?: string | null;
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ intent?: string }>;
};

export default async function PublicDevisPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const query = await searchParams;
  const rawIntent = typeof query.intent === "string" ? query.intent.trim() : "";
  const initialIntent = rawIntent === "accepte" || rawIntent === "refuse" ? rawIntent : null;
  let devis: PublicDevis | null = null;
  try {
    devis = (await backendFetch(`/api/public/devis/${encodeURIComponent(token)}`, {
      auth: false,
    })) as PublicDevis;
  } catch {
    notFound();
  }
  if (!devis?.numero) notFound();

  const lignes = devis.lignes ?? [];
  const statut = devis.statut ?? "brouillon";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Devis {devis.numero}</h1>
      <p className="text-slate-600 dark:text-slate-400">Client : {devis.client_nom || "—"}</p>
      <p className="mt-2">
        <Badge statut={statut} />
      </p>
      {devis.date_creation ? (
        <p className="mt-2 text-sm text-slate-500">Création : {formatDateFr(devis.date_creation)}</p>
      ) : null}

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="py-2">Désignation</th>
            <th className="py-2 text-right">Qté</th>
            <th className="py-2">Unité</th>
            <th className="py-2 text-right">PU HT</th>
            <th className="py-2 text-right">TVA</th>
            <th className="py-2 text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, idx) => (
            <tr key={`${idx}-${l.designation}`} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-2">{l.designation}</td>
              <td className="py-2 text-right">{l.quantite}</td>
              <td className="py-2">{l.unite}</td>
              <td className="py-2 text-right">{formatCurrencyEUR(Number(l.prix_ht ?? 0))}</td>
              <td className="py-2 text-right">{l.tva}%</td>
              <td className="py-2 text-right">{formatCurrencyEUR(Number(l.total_ht ?? 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 text-right text-sm">
        <p>Total HT : {formatCurrencyEUR(Number(devis.total_ht ?? 0))}</p>
        <p>Total TVA : {formatCurrencyEUR(Number(devis.total_tva ?? 0))}</p>
        <p className="text-lg font-semibold">Total TTC : {formatCurrencyEUR(Number(devis.total_ttc ?? 0))}</p>
      </div>

      {devis.notes?.trim() ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{devis.notes}</p>
        </div>
      ) : null}

      <PublicDevisDecision
        token={token}
        initialStatut={statut}
        numero={devis.numero}
        peutRepondre={Boolean(devis.peut_repondre)}
        initialIntent={initialIntent}
      />
    </div>
  );
}
