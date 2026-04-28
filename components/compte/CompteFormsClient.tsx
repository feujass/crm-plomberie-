"use client";

import { Building2, Camera, ImagePlus, Mail, SlidersHorizontal, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(json.message ?? `Erreur ${res.status}`);
}

export function CompteProfilFormClient({
  email,
  initial,
}: {
  email: string;
  initial: { prenom: string | null; nom: string | null; tel: string };
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          await postJson("/api/compte/profil", {
            prenom: String(fd.get("prenom") || "").trim(),
            nom: String(fd.get("nom") || "").trim(),
            tel: String(fd.get("tel") || "").trim(),
          });
          router.refresh();
        } catch (er) {
          setErr(er instanceof Error ? er.message : "Erreur");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Nom</p>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <User className="size-5 text-gray-600 dark:text-gray-400" aria-hidden />
          </span>
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input label="Prénom" name="prenom" defaultValue={initial.prenom ?? ""} autoComplete="given-name" />
            <Input label="Nom" name="nom" defaultValue={initial.nom ?? ""} autoComplete="family-name" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <User className="size-10 text-[color:var(--primary)] opacity-80" aria-hidden />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Photo de profil : gestion avancée à venir.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <span className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 opacity-60 dark:border-gray-700 dark:text-gray-400">
            <Camera className="size-4" aria-hidden />
            Prendre une photo
          </span>
          <span className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 opacity-60 dark:border-gray-700 dark:text-gray-400">
            <ImagePlus className="size-4" aria-hidden />
            Choisir une photo
          </span>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">Format carré recommandé.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Contact</p>
        <Input
          label="Téléphone"
          name="tel"
          type="tel"
          autoComplete="tel"
          placeholder="+33 6 12 34 56 78"
          defaultValue={initial.tel}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Adresse mail</p>
        <div className="flex items-center gap-3">
          <Mail className="size-5 shrink-0 text-gray-400" aria-hidden />
          <p className="text-sm font-medium text-[var(--foreground)]">{email}</p>
        </div>
        <p className="mt-2 text-xs text-gray-500">L&apos;identifiant de connexion ne peut pas être modifié ici.</p>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={pending}>
        {pending ? "…" : "Mettre à jour"}
      </Button>
    </form>
  );
}

export function CompteEntrepriseFormClient({
  profile,
}: {
  profile: {
    entreprise?: string | null;
    logo_url?: string | null;
    siret?: string | null;
    adresse?: string | null;
    email_facturation?: string | null;
    mention_legale?: string | null;
    conditions_paiement?: string | null;
  };
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          await postJson("/api/compte/entreprise", {
            entreprise: String(fd.get("entreprise") || ""),
            logo_url: String(fd.get("logo_url") || ""),
            siret: String(fd.get("siret") || ""),
            adresse: String(fd.get("adresse") || ""),
            email_facturation: String(fd.get("email_facturation") || ""),
            mention_legale: String(fd.get("mention_legale") || ""),
            conditions_paiement: String(fd.get("conditions_paiement") || ""),
          });
          router.refresh();
        } catch (er) {
          setErr(er instanceof Error ? er.message : "Erreur");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <Building2 className="size-5 text-gray-700 dark:text-gray-300" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Identité</p>
            <p className="font-semibold text-[var(--foreground)]">Identité de l&apos;entreprise</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input label="NOM" name="entreprise" defaultValue={profile.entreprise ?? ""} />

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-center dark:border-gray-700 dark:bg-gray-950/50">
            <p className="mb-2 text-xs text-gray-500">Logo (URL pour l&apos;instant)</p>
            <Input name="logo_url" defaultValue={profile.logo_url ?? ""} placeholder="https://…" className="text-left" />
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-400">
              <ImagePlus className="size-3.5 shrink-0" aria-hidden />
              Format carré recommandé.
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Spécialités</p>
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
              Déclaration des spécialités métier : prochainement. En attendant, précisez-les dans les mentions légales ou les notes de devis.
            </p>
          </div>

          <Input label="SIRET" name="siret" defaultValue={profile.siret ?? ""} />
          <Input label="Adresse" name="adresse" defaultValue={profile.adresse ?? ""} />
          <Input label="Email facturation" name="email_facturation" type="email" defaultValue={profile.email_facturation ?? ""} />
          <Textarea label="Mentions légales" name="mention_legale" defaultValue={profile.mention_legale ?? ""} rows={3} />
          <Textarea label="Conditions de paiement" name="conditions_paiement" defaultValue={profile.conditions_paiement ?? ""} rows={2} />
        </div>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={pending}>
        {pending ? "…" : "Mettre à jour"}
      </Button>
    </form>
  );
}

export function CompteDevisReglesFormClient({
  profile,
}: {
  profile: { structure_devis?: string | null; tva_defaut?: number | null; sep_fourniture_pose?: boolean | null };
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          await postJson("/api/compte/devis-regles", {
            tva_defaut: Number(fd.get("tva_defaut") || 10),
            sep_fourniture_pose: fd.get("sep_fourniture_pose") === "on",
            structure_devis: String(fd.get("structure_devis") || "libre"),
          });
          router.refresh();
        } catch (er) {
          setErr(er instanceof Error ? er.message : "Erreur");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="size-5 text-gray-700 dark:text-gray-300" aria-hidden />
          <p className="font-semibold text-[var(--foreground)]">Règles par défaut</p>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Structure du devis
            <select
              name="structure_devis"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[var(--foreground)] dark:border-gray-700 dark:bg-gray-950"
              defaultValue={profile.structure_devis ?? "libre"}
            >
              <option value="libre">Libre</option>
              <option value="piece">Par pièce</option>
              <option value="type_travaux">Par type de travaux</option>
            </select>
          </label>
          <Input
            label="TVA par défaut (%)"
            name="tva_defaut"
            type="number"
            defaultValue={String(profile.tva_defaut ?? 10)}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" name="sep_fourniture_pose" defaultChecked={Boolean(profile.sep_fourniture_pose)} />
            Séparer fourniture / pose
          </label>
        </div>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={pending}>
        {pending ? "…" : "Mettre à jour"}
      </Button>
    </form>
  );
}

export function CompteLogoFormClient({ defaultLogoUrl }: { defaultLogoUrl: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          await postJson("/api/compte/logo", {
            logo_url: String(fd.get("logo_url") || ""),
          });
          router.refresh();
        } catch (er) {
          setErr(er instanceof Error ? er.message : "Erreur");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <ImagePlus className="size-5 text-gray-600 dark:text-gray-400" aria-hidden />
        <p className="font-semibold text-[var(--foreground)]">Logo sur les documents</p>
      </div>
      <Input name="logo_url" defaultValue={defaultLogoUrl} placeholder="https://…" />
      <p className="text-xs text-gray-500">URL du logo (PNG ou JPG, fond transparent ou carré recommandé).</p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button type="submit" className="w-full rounded-2xl py-3.5" disabled={pending}>
        {pending ? "…" : "Enregistrer le logo"}
      </Button>
    </form>
  );
}

export function CompteDeleteAccountFormClient() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          const res = await fetch("/api/compte/delete-account", { method: "POST" });
          const json = (await res.json().catch(() => ({}))) as { redirect?: string };
          if (typeof json.redirect === "string") router.push(json.redirect);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Button type="submit" variant="danger" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5">
        <Trash2 className="size-4" aria-hidden />
        {pending ? "…" : "Supprimer mon compte"}
      </Button>
    </form>
  );
}
