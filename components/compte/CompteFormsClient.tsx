"use client";

import { Building2, ImagePlus, Mail, SlidersHorizontal, Trash2, User } from "lucide-react";
import type { BackendProfile } from "@/types/backend";
import { CompteLogoPicker } from "@/components/compte/CompteLogoPicker";
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
  initial: { prenom: string | null; nom: string | null; tel: string; avatar_url?: string | null };
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
            avatar_url: String(fd.get("avatar_url") || "").trim(),
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Photo de profil</p>
        <CompteLogoPicker kind="avatar" name="avatar_url" defaultUrl={initial.avatar_url ?? ""} maxEdge={384} />
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
  profile: BackendProfile;
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
            siren: String(fd.get("siren") || ""),
            forme_juridique: String(fd.get("forme_juridique") || ""),
            capital_social: String(fd.get("capital_social") || ""),
            rcs_ville: String(fd.get("rcs_ville") || ""),
            numero_tva_intracom: String(fd.get("numero_tva_intracom") || ""),
            tva_sur_encaissements: fd.get("tva_sur_encaissements") === "on",
            tva_sur_debits_opt_in: fd.get("tva_sur_debits_opt_in") === "on",
            decennale_mention: String(fd.get("decennale_mention") || ""),
            iban: String(fd.get("iban") || ""),
            bic: String(fd.get("bic") || ""),
            adresse: String(fd.get("adresse") || ""),
            email_facturation: String(fd.get("email_facturation") || ""),
            mention_legale: String(fd.get("mention_legale") || ""),
            conditions_paiement: String(fd.get("conditions_paiement") || ""),
            specialites: String(fd.get("specialites") || ""),
            feature_flag_pdp: fd.get("feature_flag_pdp") === "on",
            feature_flag_ereporting: fd.get("feature_flag_ereporting") === "on",
            feature_flag_chorus: fd.get("feature_flag_chorus") === "on",
            feature_flag_esign_advanced: fd.get("feature_flag_esign_advanced") === "on",
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

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Logo</p>
            <CompteLogoPicker defaultUrl={profile.logo_url ?? ""} />
          </div>

          <Textarea
            label="Spécialités"
            name="specialites"
            defaultValue={profile.specialites ?? ""}
            rows={3}
            placeholder="Ex. Plomberie, chauffage, assainissement…"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Indiquez vos corps d’état ou zones d’intervention. Ce texte peut être réutilisé sur vos documents.
          </p>

          <Input label="SIRET" name="siret" defaultValue={profile.siret ?? ""} />
          <Input label="SIREN (9 chiffres)" name="siren" defaultValue={profile.siren ?? ""} />
          <Input label="Forme juridique" name="forme_juridique" placeholder="SARL, SASU, EI…" defaultValue={profile.forme_juridique ?? ""} />
          <Input label="Capital social" name="capital_social" defaultValue={profile.capital_social ?? ""} />
          <Input label="RCS (ville)" name="rcs_ville" defaultValue={profile.rcs_ville ?? ""} />
          <Input
            label="N° TVA intracommunautaire"
            name="numero_tva_intracom"
            defaultValue={profile.numero_tva_intracom ?? ""}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="tva_sur_encaissements" defaultChecked={profile.tva_sur_encaissements !== false} />
            TVA sur les encaissements (cochez si vous y êtes assujetti)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="tva_sur_debits_opt_in" defaultChecked={profile.tva_sur_debits_opt_in === true} />
            Option pour la TVA sur les débits (si applicable)
          </label>
          <Textarea
            label="Assurance décennale / RC pro (BTP)"
            name="decennale_mention"
            defaultValue={profile.decennale_mention ?? ""}
            rows={2}
            placeholder="Ex. Assurance décennale n°…"
          />
          <Input label="IBAN" name="iban" defaultValue={profile.iban ?? ""} autoComplete="off" />
          <Input label="BIC" name="bic" defaultValue={profile.bic ?? ""} />
          <Input label="Adresse" name="adresse" defaultValue={profile.adresse ?? ""} />
          <Input label="Email facturation" name="email_facturation" type="email" defaultValue={profile.email_facturation ?? ""} />
          <Textarea label="Mentions légales" name="mention_legale" defaultValue={profile.mention_legale ?? ""} rows={3} />
          <Textarea label="Conditions de paiement" name="conditions_paiement" defaultValue={profile.conditions_paiement ?? ""} rows={2} />
          <div className="rounded-xl border border-dashed border-gray-300 p-3 dark:border-gray-600">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Fonctionnalités conformité</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="feature_flag_pdp" defaultChecked={profile.feature_flag_pdp !== false} />
              PDP / e-invoicing & e-reporting
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" name="feature_flag_ereporting" defaultChecked={profile.feature_flag_ereporting !== false} />
              E-reporting explicite
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" name="feature_flag_chorus" defaultChecked={profile.feature_flag_chorus !== false} />
              Chorus Pro (secteur public)
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" name="feature_flag_esign_advanced" defaultChecked={profile.feature_flag_esign_advanced !== false} />
              Signature électronique avancée (devis)
            </label>
          </div>
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
      <CompteLogoPicker defaultUrl={defaultLogoUrl} />
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
