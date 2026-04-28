import { Card } from "@/components/ui/Card";
import { NouveauOuvrageFormClient } from "@/components/catalogue/NouveauOuvrageFormClient";

export default function NouvelOuvragePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouvel ouvrage</h1>
      <Card>
        <NouveauOuvrageFormClient />
      </Card>
    </div>
  );
}
