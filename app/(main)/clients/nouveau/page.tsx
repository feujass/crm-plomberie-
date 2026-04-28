import { createClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";

export default function NouveauClientPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouveau client</h1>
      <Card>
        <form action={createClientAction} className="space-y-3">
          <Input label="Nom" name="nom" required />
          <Input label="Prénom" name="prenom" />
          <Input label="Email" name="email" type="email" />
          <Input label="Téléphone" name="tel" type="tel" />
          <Input label="Adresse" name="adresse" />
          <label className="block text-sm font-medium">
            Type
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              defaultValue="particulier"
            >
              <option value="particulier">Particulier</option>
              <option value="professionnel">Professionnel</option>
            </select>
          </label>
          <Input label="SIRET (pro)" name="siret" />
          <Textarea label="Notes" name="notes" rows={3} />
          <div className="flex gap-2">
            <Button type="submit">Enregistrer</Button>
            <Link href="/clients">
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
