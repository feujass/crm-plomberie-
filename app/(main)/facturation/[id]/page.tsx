import { addPaiementAction } from "@/app/actions/factures";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BackendFactureDetail } from "@/types/backend";

type Props = { params: Promise<{ id: string }> };

export default async function FactureDetailPage({ params }: Props) {
  const { id } = await params;
  let facture: BackendFactureDetail | null = null;
  try {
    facture = (await backendFetch(`/api/factures/${id}`)) as BackendFactureDetail;
  } catch {
    facture = null;
  }
  if (!facture) notFound();

  const pays = facture.paiements ?? [];
  const sumPay = pays.reduce((s, p) => s + Number(p.montant || 0), 0);
  const ttc = Number(facture.total_ttc ?? 0);
  const solde = Math.max(0, ttc - sumPay);

  const lignes = (facture.lignes ?? []).slice();

  return (
    <div className="space-y-4">
      <Link href="/facturation" className="text-sm text-sky-600 hover:underline">
        ← Factures
      </Link>
      <h1 className="text-2xl font-bold">
        {facture.numero} <Badge statut={facture.statut ?? "—"} />
      </h1>
      <p className="text-sm text-slate-600">
        Émission {formatDateFr(facture.date_emission)} — Échéance {formatDateFr(facture.date_echeance)}
      </p>
      <p className="text-sm text-slate-500">Lien public : bientôt (non exposé côté backend).</p>

      <Card title="Lignes">
        <table className="w-full text-left text-sm">
          <tbody>
            {lignes.map((l, idx) => (
              <tr key={`${idx}-${l.designation}`} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1">{l.designation}</td>
                <td className="py-1 text-right">{l.quantite}</td>
                <td className="py-1">{l.unite}</td>
                <td className="py-1 text-right">{formatCurrencyEUR(Number(l.total_ht ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-right text-sm font-medium">TTC : {formatCurrencyEUR(ttc)}</p>
      </Card>

      <Card title={`Paiements — solde ${formatCurrencyEUR(solde)}`}>
        <ul className="mb-3 text-sm">
          {(pays ?? []).map((p) => (
            <li key={p.id}>
              {formatDateFr(p.date)} — {formatCurrencyEUR(Number(p.montant))} ({p.mode})
            </li>
          ))}
        </ul>
        <form action={addPaiementAction.bind(null, id)} className="flex flex-wrap gap-2">
          <Input label="Montant" name="montant" type="number" step="0.01" required />
          <Input label="Date" name="date" type="date" required />
          <label className="block text-sm font-medium">
            Mode
            <select
              name="mode"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              defaultValue="virement"
            >
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
              <option value="cb">CB</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <Button type="submit">Enregistrer paiement</Button>
        </form>
      </Card>
    </div>
  );
}
