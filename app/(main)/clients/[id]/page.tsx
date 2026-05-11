import { EditClientFormClient } from "@/components/clients/ClientFormsClient";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BackendClientDetail } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  let client: BackendClientDetail | null = null;
  try {
    client = (await backendFetch(`/api/clients/${id}`)) as BackendClientDetail;
  } catch {
    client = null;
  }
  if (!client) notFound();

  const devis = client.devis ?? [];
  const factures = client.factures ?? [];
  const ca = Number(client.ca_total ?? 0);

  let chantiersClient: Chantier[] = [];
  try {
    const rows = (await backendFetch(
      `/api/chantiers?client_id=${encodeURIComponent(id)}`,
    ).catch(() => [])) as Chantier[];
    chantiersClient = Array.isArray(rows) ? rows : [];
  } catch {
    chantiersClient = [];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${client.tel || ""}`} className="text-sm text-sky-600 hover:underline">
          Appeler
        </a>
        <a href={`mailto:${client.email || ""}`} className="text-sm text-sky-600 hover:underline">
          Email
        </a>
        <Link href={`/devis/nouveau?client=${id}`} className="text-sm text-sky-600 hover:underline">
          Nouveau devis
        </Link>
        <Link href={`/chantiers/nouveau?client=${id}`} className="text-sm text-sky-600 hover:underline">
          Nouveau chantier
        </Link>
      </div>

      <Card title="Fiche client">
        <EditClientFormClient clientId={id} initial={client} />
      </Card>

      <Card title={`CA factures payées : ${formatCurrencyEUR(ca)}`}>
        <p className="text-sm text-slate-600">Devis</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(devis ?? []).map((d) => (
            <li key={d.id}>
              <Link href={`/devis/${d.id}`} className="text-sky-600 hover:underline">
                {d.numero}
              </Link>{" "}
              <Badge statut={d.statut ?? "—"} /> {formatCurrencyEUR(Number(d.total_ttc))} — {formatDateFr(d.created_at)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">Chantiers</p>
        {chantiersClient.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Aucun chantier lié à ce client.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {chantiersClient.map((c) => (
              <li key={c.id}>
                <Link href={`/chantiers/${c.id}`} className="text-sky-600 hover:underline">
                  {c.name || "Sans nom"}
                </Link>
                {c.status ? (
                  <>
                    {" "}
                    <Badge statut={c.status} />
                  </>
                ) : null}
                {c.due_date ? (
                  <span className="text-slate-500"> — échéance {formatDateFr(c.due_date)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">Factures</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(factures ?? []).map((f) => (
            <li key={f.id}>
              Facture :{" "}
              <Link href={`/facturation/${f.id}`} className="text-sky-600 hover:underline">
                {f.numero}
              </Link>{" "}
              <Badge statut={f.statut ?? "—"} /> {formatCurrencyEUR(Number(f.total_ttc))}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
