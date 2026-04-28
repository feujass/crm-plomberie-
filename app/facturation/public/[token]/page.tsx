import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import type { DevisLigneRow } from "@/types/database";
import { Badge } from "@/components/ui/Badge";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicFacturePage({ params }: PageProps) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: facture } = await admin.from("factures").select("*, facture_lignes(*)").eq("share_token", token).maybeSingle();

  if (!facture) {
    return <p className="p-8 text-center text-slate-600">Facture introuvable.</p>;
  }

  const lignes = ((facture as { facture_lignes?: DevisLigneRow[] }).facture_lignes ?? []).slice().sort((a, b) => a.ordre - b.ordre);

  let clientName = "—";
  if (facture.client_id) {
    const { data: c } = await admin.from("clients").select("nom, prenom").eq("id", facture.client_id).maybeSingle();
    if (c) clientName = [c.prenom, c.nom].filter(Boolean).join(" ") || c.nom;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Facture {facture.numero}</h1>
      <p className="text-slate-600">Client : {clientName}</p>
      <p className="mt-2">
        <Badge statut={facture.statut} />
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Émission : {formatDateFr(facture.date_emission)} — Échéance : {formatDateFr(facture.date_echeance)}
      </p>

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
        <p>Total HT : {formatCurrencyEUR(Number(facture.total_ht))}</p>
        <p>Total TVA : {formatCurrencyEUR(Number(facture.total_tva))}</p>
        <p className="text-lg font-semibold">Total TTC : {formatCurrencyEUR(Number(facture.total_ttc))}</p>
      </div>
    </div>
  );
}
