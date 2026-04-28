import { createOuvrageAction } from "@/app/actions/ouvrages";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";

export default function NouvelOuvragePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouvel ouvrage</h1>
      <Card>
        <form action={createOuvrageAction} className="space-y-3">
          <Input label="Nom" name="nom" required />
          <Textarea label="Description" name="description" rows={2} />
          <label className="block text-sm font-medium">
            Type
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              defaultValue="ouvrage"
            >
              <option value="main_oeuvre">Main d&apos;œuvre</option>
              <option value="fourniture">Fourniture</option>
              <option value="ouvrage">Ouvrage</option>
            </select>
          </label>
          <Input label="Prix unitaire HT" name="prix_ht" type="number" step="0.01" required />
          <Input label="Unité (h, forfait, ml…)" name="unite" defaultValue="forfait" />
          <Input label="TVA %" name="tva" type="number" defaultValue="10" />
          <Input label="Tags (virgules)" name="tags" placeholder="sanitaire, urgence" />
          <div className="flex gap-2">
            <Button type="submit">Enregistrer</Button>
            <Link href="/catalogue">
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
