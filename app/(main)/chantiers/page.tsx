import { ChantiersBoard } from "@/components/chantiers/ChantiersBoard";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

export default async function ChantiersPage() {
  const chantiers = (await backendFetch("/api/chantiers").catch(() => [])) as Chantier[];
  const clients = (await backendFetch("/api/clients").catch(() => [])) as BackendClient[];
  const devis = (await backendFetch("/api/devis").catch(() => [])) as BackendDevis[];

  return (
    <ChantiersBoard initialChantiers={chantiers} clients={clients} devis={devis} />
  );
}
