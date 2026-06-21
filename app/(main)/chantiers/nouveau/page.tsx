import { ChantierCreateForm, type ChantierPrefillFromDevis } from "@/components/chantiers/ChantierCreateForm";
import { addDaysIso } from "@/lib/chantier-next-action";
import { Card } from "@/components/ui/Card";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient, BackendDevis, BackendDevisDetail } from "@/types/backend";
import Link from "next/link";

async function buildPrefillFromDevis(devisId: string): Promise<ChantierPrefillFromDevis | null> {
  let d: BackendDevisDetail;
  try {
    d = (await backendFetch(`/api/devis/${devisId}`)) as BackendDevisDetail;
  } catch {
    return null;
  }
  const cid = String(d.client_id ?? "").trim();
  if (!cid) return null;
  const numero = (d.numero ?? devisId).trim();
  const ttc = Number(d.total_ttc ?? 0);
  const ht = Number(d.total_ht ?? 0);
  const budget = ttc > 0 ? ttc : ht;
  return {
    name: `Suivi · ${numero}`,
    client_id: cid,
    site_address: String(d.adresse_chantier ?? "").trim(),
    devis_id: devisId,
    budget_estime: budget > 0 ? String(Math.round(budget * 100) / 100) : "",
    due_date: addDaysIso(21),
    next_action_label: "Confirmer le démarrage avec le client",
    next_action_date: addDaysIso(5),
    chantier_type: "plomberie",
  };
}

export default async function NouveauChantierPage({
  searchParams,
}: {
  searchParams: Promise<{ devis?: string }>;
}) {
  const sp = await searchParams;
  const devisId = typeof sp.devis === "string" ? sp.devis.trim() : "";

  const clients = (await backendFetch("/api/clients").catch(() => [])) as BackendClient[];
  const devis = (await backendFetch("/api/devis").catch(() => [])) as BackendDevis[];

  let prefill: ChantierPrefillFromDevis | null = null;
  if (devisId) {
    prefill = await buildPrefillFromDevis(devisId);
  }

  return (
    <div className="space-y-4">
      <Link href="/chantiers" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Chantiers
      </Link>
      <h1 className="text-2xl font-bold">Nouveau chantier</h1>
      {devisId && !prefill ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
          Impossible de préremplir depuis ce devis : vérifie qu&apos;un <strong>client</strong> est bien lié au devis, puis réessaie
          depuis la fiche devis.
        </div>
      ) : null}
      <Card title="Informations">
        <ChantierCreateForm clients={clients} devis={devis} prefill={prefill} />
      </Card>
    </div>
  );
}
