import { DevisImportClient } from "@/components/devis/DevisImportClient";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient } from "@/types/backend";

export default async function DevisImportPage() {
  const clients = (await backendFetch("/api/clients")) as BackendClient[];
  const sorted = [...(clients ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  return <DevisImportClient clients={sorted} />;
}
