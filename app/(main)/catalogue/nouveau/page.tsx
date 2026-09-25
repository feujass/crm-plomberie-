import { Card } from "@/components/ui/Card";
import { NouveauOuvrageFormClient } from "@/components/catalogue/NouveauOuvrageFormClient";

export default async function NouvelOuvragePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type?.trim() ?? "ouvrage";
  const title =
    type === "fourniture"
      ? "Nouvelle fourniture"
      : type === "main_oeuvre"
        ? "Nouvelle main d\u2019œuvre"
        : "Nouvel ouvrage";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {type === "fourniture"
          ? "Matériau ou produit que vous achetez souvent — l’IA reprendra ce prix HT sur vos devis."
          : "Tarif enregistré dans votre bibliothèque pour les prochains devis."}
      </p>
      <Card>
        <NouveauOuvrageFormClient defaultType={type} />
      </Card>
    </div>
  );
}
