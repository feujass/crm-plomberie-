import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import { notFound } from "next/navigation";

type PublicFacture = {
  numero?: string;
  client_nom?: string;
  statut?: string;
  lignes?: { designation: string; quantite?: number; unite?: string; total_ht?: number }[];
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  notes?: string;
  date_emission?: string;
  date_echeance?: string;
};

type Props = { params: Promise<{ token: string }> };

export default async function FacturePubliquePage({ params }: Props) {
  const { token } = await params;
  let data: PublicFacture | null = null;
  try {
    data = (await backendFetch(`/api/public/factures/${encodeURIComponent(token)}`, {
      auth: false,
    })) as PublicFacture;
  } catch {
    notFound();
  }
  if (!data?.numero) notFound();

  const lignes = data.lignes ?? [];
  const ttc = Number(data.total_ttc ?? 0);

  return (
    <div className="min-h-svh bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">Facture</p>
        <h1 className="mt-1 text-center text-2xl font-bold">{data.numero}</h1>
        {data.client_nom ? <p className="mt-2 text-center text-slate-600 dark:text-slate-400">{data.client_nom}</p> : null}
        <div className="mt-4 space-y-1 text-center text-sm text-slate-600 dark:text-slate-400">
          {data.date_emission ? <p>Émission : {formatDateFr(data.date_emission)}</p> : null}
          {data.date_echeance ? <p>Échéance : {formatDateFr(data.date_echeance)}</p> : null}
          {data.statut ? <p>Statut : {data.statut}</p> : null}
        </div>

        {data.notes?.trim() ? (
          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
            {data.notes}
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {lignes.map((l, idx) => (
                <tr key={`${idx}-${l.designation}`} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-2">{l.designation}</td>
                  <td className="py-2 text-right tabular-nums">{l.quantite ?? "—"}</td>
                  <td className="py-2">{l.unite ?? ""}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrencyEUR(Number(l.total_ht ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-right text-base font-semibold">Total TTC : {formatCurrencyEUR(ttc)}</p>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          Document fourni à titre informatif. Pour toute question, contactez l’émetteur de la facture.
        </p>
      </div>
    </div>
  );
}
