import { Card } from "@/components/ui/Card";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function ChantierDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link href="/chantiers" className="text-sm text-[color:var(--primary)] hover:underline">
        ← Chantiers
      </Link>
      <h1 className="text-2xl font-bold">Chantier</h1>
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Fiche chantier détaillée : à finaliser (la vue principale est disponible sur la page Chantiers).
        </p>
        <p className="mt-2 text-sm text-slate-500">ID : {id}</p>
      </Card>
    </div>
  );
}
