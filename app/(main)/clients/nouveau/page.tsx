import { Card } from "@/components/ui/Card";
import { NouveauClientFormClient } from "@/components/clients/ClientFormsClient";

export default function NouveauClientPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouveau client</h1>
      <Card>
        <NouveauClientFormClient />
      </Card>
    </div>
  );
}
