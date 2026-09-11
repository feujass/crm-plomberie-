import { EditClientFormClient } from "@/components/clients/ClientFormsClient";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { backendFetch } from "@/lib/backend/server";
import { formatCurrencyEUR, formatDateFr } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BackendClientDetail } from "@/types/backend";

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

  return (
    <div className="space-y-4">
      <CircleBackLink href="/clients" label="Retour aux clients" />
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
