import { NouveauOuvrageFormClient } from "@/components/catalogue/NouveauOuvrageFormClient";
import { Card } from "@/components/ui/Card";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { backendFetch } from "@/lib/backend/server";
import type { BackendOuvrage } from "@/types/backend";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

function editTitle(type?: string) {
  if (type === "fourniture") return "Modifier la fourniture";
  if (type === "main_oeuvre") return "Modifier la main d\u2019œuvre";
  return "Modifier l\u2019ouvrage";
}

export default async function CatalogueEditPage({ params }: Props) {
  const { id } = await params;
  let ouvrage: BackendOuvrage | null = null;
  try {
    ouvrage = (await backendFetch(`/api/ouvrages/${id}`)) as BackendOuvrage;
  } catch {
    ouvrage = null;
  }
  if (!ouvrage?.id) notFound();

  return (
    <div className="space-y-4 pb-6">
      <CircleBackLink href="/catalogue" label="Retour au catalogue" />
      <h1 className="text-2xl font-bold">{editTitle(ouvrage.type)}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Mettez à jour le prix et les détails de cet élément.</p>
      <Card>
        <NouveauOuvrageFormClient initial={ouvrage} />
      </Card>
    </div>
  );
}
