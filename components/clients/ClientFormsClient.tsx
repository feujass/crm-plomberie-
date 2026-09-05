"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ClientInitial = {
  nom: string;
  prenom?: string | null;
  email?: string | null;
  tel?: string | null;
  adresse?: string | null;
  type?: string;
  siret?: string | null;
  siren?: string | null;
  tva_intracom?: string | null;
  categorie_fiscale?: string | null;
  secteur_public?: boolean;
  chorus_service_code?: string | null;
  notes?: string | null;
  inactive?: boolean;
};

export function NouveauClientFormClient() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const body = {
          nom: String(fd.get("nom") || "").trim(),
          prenom: String(fd.get("prenom") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          tel: String(fd.get("tel") || "").trim(),
          adresse: String(fd.get("adresse") || "").trim(),
          type: String(fd.get("type") || "particulier"),
          siret: String(fd.get("siret") || "").trim(),
          siren: String(fd.get("siren") || "").trim(),
          tva_intracom: String(fd.get("tva_intracom") || "").trim(),
          categorie_fiscale: String(fd.get("categorie_fiscale") || "").trim(),
          secteur_public: fd.get("secteur_public") === "on",
          chorus_service_code: String(fd.get("chorus_service_code") || "").trim(),
          notes: String(fd.get("notes") || "").trim(),
        };
        try {
          const res = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = (await res.json()) as { redirect?: string; message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          router.push(typeof json.redirect === "string" ? json.redirect : "/clients");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
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
      <Input label="SIREN (pro)" name="siren" />
      <Input label="SIRET (pro)" name="siret" />
      <Input label="N° TVA intracom (pro assujetti)" name="tva_intracom" />
      <label className="block text-sm font-medium">
        Catégorie fiscale
        <select
          name="categorie_fiscale"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue="particulier"
        >
          <option value="particulier">Particulier</option>
          <option value="pro_assujetti">Pro assujetti TVA (France)</option>
          <option value="pro_non_assujetti">Pro non assujetti / franchise</option>
          <option value="pro_international">Pro à l&apos;étranger / intracom</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="secteur_public" />
        Client secteur public (marchés publics / Chorus Pro)
      </label>
      <Input label="Code service Chorus (optionnel)" name="chorus_service_code" />
      <Textarea label="Notes" name="notes" rows={3} />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Link href="/clients">
          <Button type="button" variant="secondary">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  );
}

export function EditClientFormClient({ clientId, initial }: { clientId: string; initial: ClientInitial }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const body = {
          nom: String(fd.get("nom") || "").trim(),
          prenom: String(fd.get("prenom") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          tel: String(fd.get("tel") || "").trim(),
          adresse: String(fd.get("adresse") || "").trim(),
          type: String(fd.get("type") || "particulier"),
          siret: String(fd.get("siret") || "").trim(),
          siren: String(fd.get("siren") || "").trim(),
          tva_intracom: String(fd.get("tva_intracom") || "").trim(),
          categorie_fiscale: String(fd.get("categorie_fiscale") || "").trim(),
          secteur_public: fd.get("secteur_public") === "on",
          chorus_service_code: String(fd.get("chorus_service_code") || "").trim(),
          notes: String(fd.get("notes") || "").trim(),
          inactive: fd.get("inactive") === "on",
        };
        try {
          const res = await fetch(`/api/clients/${clientId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = (await res.json().catch(() => ({}))) as { message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Input label="Nom" name="nom" defaultValue={initial.nom} required />
      <Input label="Prénom" name="prenom" defaultValue={initial.prenom ?? ""} />
      <Input label="Email" name="email" type="email" defaultValue={initial.email ?? ""} />
      <Input label="Téléphone" name="tel" type="tel" defaultValue={initial.tel ?? ""} />
      <Input label="Adresse" name="adresse" defaultValue={initial.adresse ?? ""} />
      <label className="block text-sm font-medium">
        Type
        <select
          name="type"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue={initial.type ?? "particulier"}
        >
          <option value="particulier">Particulier</option>
          <option value="professionnel">Professionnel</option>
        </select>
      </label>
      <Input label="SIREN" name="siren" defaultValue={initial.siren ?? ""} />
      <Input label="SIRET" name="siret" defaultValue={initial.siret ?? ""} />
      <Input label="N° TVA intracom" name="tva_intracom" defaultValue={initial.tva_intracom ?? ""} />
      <label className="block text-sm font-medium">
        Catégorie fiscale
        <select
          name="categorie_fiscale"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue={initial.categorie_fiscale ?? (initial.type === "professionnel" ? "pro_assujetti" : "particulier")}
        >
          <option value="particulier">Particulier</option>
          <option value="pro_assujetti">Pro assujetti TVA (France)</option>
          <option value="pro_non_assujetti">Pro non assujetti / franchise</option>
          <option value="pro_international">Pro à l&apos;étranger / intracom</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="secteur_public" defaultChecked={Boolean(initial.secteur_public)} />
        Secteur public (Chorus Pro)
      </label>
      <Input
        label="Code service Chorus"
        name="chorus_service_code"
        defaultValue={initial.chorus_service_code ?? ""}
      />
      <Textarea label="Notes" name="notes" defaultValue={initial.notes ?? ""} rows={3} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="inactive" defaultChecked={Boolean(initial.inactive)} />
        Client inactif
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Mettre à jour"}
      </Button>
    </form>
  );
}
