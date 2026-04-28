import { ChantierCreateForm } from "@/components/chantiers/ChantierCreateForm";
import { Card } from "@/components/ui/Card";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient, BackendDevis } from "@/types/backend";
import Link from "next/link";

export default async function NouveauChantierPage() {
  const clients = (await backendFetch("/api/clients").catch(() => [])) as BackendClient[];
  const devis = (await backendFetch("/api/devis").catch(() => [])) as BackendDevis[];

  return (
    <div className="space-y-4">
      <Link href="/chantiers" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Chantiers
      </Link>
      <h1 className="text-2xl font-bold">Nouveau chantier</h1>
      <Card title="Informations">
        <ChantierCreateForm clients={clients} devis={devis} />
      </Card>
    </div>
  );
}
