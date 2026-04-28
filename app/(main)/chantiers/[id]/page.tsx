import { ChantierDetailEditor } from "@/components/chantiers/ChantierDetailEditor";
import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ChantierDetailPage({ params }: Props) {
  const { id } = await params;

  let chantier: Chantier;
  try {
    chantier = (await backendFetch(`/api/chantiers/${id}`)) as Chantier;
  } catch (err) {
    const e = err as BackendFetchError;
    if (e.status === 404) notFound();
    throw err;
  }

  const [clients, devis] = await Promise.all([
    backendFetch("/api/clients").catch(() => []) as Promise<BackendClient[]>,
    backendFetch("/api/devis").catch(() => []) as Promise<BackendDevis[]>,
  ]);

  return (
    <div className="space-y-4">
      <Link href="/chantiers" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Chantiers
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{chantier.name}</h1>
      <ChantierDetailEditor initial={chantier} clients={clients} devis={devis} />
    </div>
  );
}
