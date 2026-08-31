import { DevisNouveauClient } from "@/components/devis/DevisNouveauClient";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient, BackendMeResponse } from "@/types/backend";
import { Suspense } from "react";

export default async function DevisNouveauPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const clients = (await backendFetch("/api/clients")) as BackendClient[];
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const sorted = [...(clients ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  return (
    <div className="pb-8">
      <Suspense fallback={<p className="text-sm text-slate-600">Chargement…</p>}>
        <DevisNouveauClient clients={sorted} initialClientId={sp.client ?? ""} me={me} />
      </Suspense>
    </div>
  );
}
