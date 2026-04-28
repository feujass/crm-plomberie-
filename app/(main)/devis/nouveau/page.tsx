import { DevisNouveauClient } from "@/components/devis/DevisNouveauClient";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient } from "@/types/backend";

export default async function DevisNouveauPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const clients = (await backendFetch("/api/clients")) as BackendClient[];
  const sorted = [...(clients ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  return (
    <div className="pb-8">
      <DevisNouveauClient clients={sorted} initialClientId={sp.client ?? ""} />
    </div>
  );
}
