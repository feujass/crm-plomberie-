import { DevisEditor } from "@/components/devis/DevisEditor";
import { backendFetch } from "@/lib/backend/server";
import { notFound } from "next/navigation";
import type { BackendClient, BackendDevisDetail, BackendFacture, BackendProfile } from "@/types/backend";

type Props = { params: Promise<{ id: string }> };

export default async function DevisDetailPage({ params }: Props) {
  const { id } = await params;
  let devis: BackendDevisDetail | null = null;
  try {
    devis = (await backendFetch(`/api/devis/${id}`)) as BackendDevisDetail;
  } catch {
    devis = null;
  }
  if (!devis) notFound();

  const [clients, profile, factures] = await Promise.all([
    backendFetch("/api/clients").catch(() => []) as Promise<BackendClient[]>,
    backendFetch("/api/profile").catch(() => ({})) as Promise<BackendProfile>,
    backendFetch("/api/factures").catch(() => []) as Promise<BackendFacture[]>,
  ]);
  const sortedClients = [...(clients ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );
  const existingFactureId = (factures ?? []).find((f) => f.devis_id === id)?.id ?? null;

  return (
    <DevisEditor devis={devis} clients={sortedClients} profile={profile} existingFactureId={existingFactureId} />
  );
}
