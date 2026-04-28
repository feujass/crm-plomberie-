import { ChantiersBoard } from "@/components/chantiers/ChantiersBoard";
import Link from "next/link";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

export default async function NouveauChantierPage() {
  // Réutilise le board (formulaire intégré), et scroll côté client.
  const chantiers = (await backendFetch("/api/chantiers").catch(() => [])) as Chantier[];
  const clients = (await backendFetch("/api/clients").catch(() => [])) as BackendClient[];
  const devis = (await backendFetch("/api/devis").catch(() => [])) as BackendDevis[];

  return (
    <div className="space-y-4">
      <Link href="/chantiers" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Chantiers
      </Link>
      <ChantiersBoard initialChantiers={chantiers} clients={clients} devis={devis} />
    </div>
  );
}
