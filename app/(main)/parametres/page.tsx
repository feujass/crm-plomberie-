import { deleteAccountAndData, updateProfileSettings } from "@/app/actions/profile-settings";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { StripeButtons } from "@/components/parametres/StripeButtons";
import { ThemeToggle } from "@/components/parametres/ThemeToggle";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse, BackendProfile } from "@/types/backend";
import Link from "next/link";

export default async function ParametresPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  const profile = (me.profile ?? {}) as BackendProfile;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Card title="Apparence">
        <ThemeToggle />
      </Card>

      <Card title="Mon entreprise">
        <form action={updateProfileSettings} className="space-y-3">
          <Input label="Prénom" name="prenom" defaultValue={me.prenom ?? ""} autoComplete="given-name" />
          <Input label="Nom" name="nom" defaultValue={me.nom ?? ""} autoComplete="family-name" />
          <Input label="Raison sociale" name="entreprise" defaultValue={profile.entreprise ?? ""} />
          <Input label="SIRET" name="siret" defaultValue={profile.siret ?? ""} />
          <Input label="Adresse" name="adresse" defaultValue={profile.adresse ?? ""} />
          <Input label="Téléphone" name="tel" defaultValue={profile.tel ?? ""} />
          <Input label="Email facturation" name="email_facturation" type="email" defaultValue={profile.email_facturation ?? ""} />
          <Input label="TVA par défaut (%)" name="tva_defaut" type="number" defaultValue={String(profile.tva_defaut ?? 10)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sep_fourniture_pose" defaultChecked={Boolean(profile.sep_fourniture_pose)} />
            Séparer fourniture / pose
          </label>
          <label className="block text-sm font-medium">
            Structure devis
            <select
              name="structure_devis"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              defaultValue={profile.structure_devis ?? "libre"}
            >
              <option value="libre">Libre</option>
              <option value="piece">Par pièce</option>
              <option value="type_travaux">Par type de travaux</option>
            </select>
          </label>
          <Textarea label="Mentions légales" name="mention_legale" defaultValue={profile.mention_legale ?? ""} rows={3} />
          <Textarea label="Conditions de paiement" name="conditions_paiement" defaultValue={profile.conditions_paiement ?? ""} rows={2} />
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>

      <Card title="Abonnement Stripe">
        <p className="mb-2 text-sm text-slate-600">Stripe : à rebrancher (anciennement Supabase).</p>
        <StripeButtons hasStripeCustomer={false} />
      </Card>

      <Card title="Export RGPD">
        <p className="mb-2 text-sm text-slate-600">Téléchargez une copie de vos données.</p>
        <a
          href="/api/export/me"
          className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900"
        >
          Télécharger JSON
        </a>
      </Card>

      <Card title="Sécurité">
        <Link href="/forgot-password" className="text-sm text-sky-600 hover:underline">
          Réinitialiser le mot de passe (email)
        </Link>
      </Card>

      <Card title="Supprimer le compte">
        <p className="mb-2 text-sm text-red-700">Action irréversible (pas encore implémentée côté backend).</p>
        <form action={deleteAccountAndData}>
          <Button type="submit" variant="danger">
            Supprimer définitivement
          </Button>
        </form>
      </Card>
    </div>
  );
}
