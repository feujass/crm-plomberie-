import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { notFound } from "next/navigation";

type PublicDevis = {
  numero?: string;
  client_nom?: string;
  statut?: string;
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
};

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicDevisPage({ params }: PageProps) {
  const { token } = await params;
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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Devis {devis.numero}</h1>
      <p className="text-slate-600">Client : {devis.client_nom || "—"}</p>
      <p className="mt-2">
        <Badge statut={devis.statut ?? "brouillon"} />
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
    </div>
  );
}
