import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import type { DevisLigneRow } from "@/types/database";
import { Badge } from "@/components/ui/Badge";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicDevisPage({ params }: PageProps) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: devis } = await admin.from("devis").select("*, devis_lignes(*)").eq("share_token", token).maybeSingle();

  if (!devis) {
    return <p className="p-8 text-center text-slate-600">Devis introuvable.</p>;
  }

  const lignes = ((devis as { devis_lignes?: DevisLigneRow[] }).devis_lignes ?? []).slice().sort((a, b) => a.ordre - b.ordre);

  let clientName = "—";
  if (devis.client_id) {
    const { data: c } = await admin.from("clients").select("nom, prenom").eq("id", devis.client_id).maybeSingle();
    if (c) clientName = [c.prenom, c.nom].filter(Boolean).join(" ") || c.nom;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Devis {devis.numero}</h1>
      <p className="text-slate-600">Client : {clientName}</p>
      <p className="mt-2">
        <Badge statut={devis.statut} />
      </p>
      <p className="mt-2 text-sm text-slate-500">Création : {formatDateFr(devis.date_creation)}</p>

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
          {lignes.map((l) => (
            <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-2">{l.designation}</td>
              <td className="py-2 text-right">{l.quantite}</td>
              <td className="py-2">{l.unite}</td>
              <td className="py-2 text-right">{formatCurrencyEUR(l.prix_ht)}</td>
              <td className="py-2 text-right">{l.tva}%</td>
              <td className="py-2 text-right">{formatCurrencyEUR(l.total_ht)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 text-right text-sm">
        <p>Total HT : {formatCurrencyEUR(Number(devis.total_ht))}</p>
        <p>Total TVA : {formatCurrencyEUR(Number(devis.total_tva))}</p>
        <p className="text-lg font-semibold">Total TTC : {formatCurrencyEUR(Number(devis.total_ttc))}</p>
      </div>
    </div>
  );
}
