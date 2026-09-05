import { DevisEditor } from "@/components/devis/DevisEditor";
import { backendFetch } from "@/lib/backend/server";
import { notFound } from "next/navigation";
import type { BackendClient, BackendDevisDetail, BackendProfile } from "@/types/backend";

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

  const clients = (await backendFetch("/api/clients")) as BackendClient[];
  const sortedClients = [...(clients ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  let profile: BackendProfile = {};
  try {
    profile = (await backendFetch("/api/profile")) as BackendProfile;
  } catch {
    profile = {};
  }

  return <DevisEditor devis={devis} clients={sortedClients} profile={profile} />;
}
