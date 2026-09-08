import type { AdresseStructuree } from "@/lib/facturation/adresse";
import type { RegimeTva } from "@/lib/facturation/regime-tva";
import { optionTvaDebitsFromRegime, parseRegimeTva } from "@/lib/facturation/regime-tva";
import type { NatureOperation } from "@/lib/facturation/type-ligne";

export type SnapshotEmetteur = {
  entreprise_nom: string;
  siren: string | null;
  siret: string | null;
  numero_tva_intracom: string | null;
  forme_juridique: string | null;
  regime_tva: RegimeTva;
  option_tva_debits: boolean;
  adresse: AdresseStructuree;
  email_facturation: string | null;
  tel: string | null;
  iban: string | null;
  bic: string | null;
  rcs_ville: string | null;
  capital_social: string | null;
};

export type SnapshotClient = {
  nom: string;
  prenom: string | null;
  type_client: "particulier" | "entreprise" | "public";
  siren: string | null;
  siret: string | null;
  tva_intracom: string | null;
  adresse_facturation: AdresseStructuree;
  adresse_livraison: AdresseStructuree | null;
  email: string | null;
  tel: string | null;
};

export function buildSnapshotEmetteur(profile: {
  entreprise?: string | null;
  siren?: string | null;
  siret?: string | null;
  numero_tva_intracom?: string | null;
  forme_juridique?: string | null;
  regime_tva?: RegimeTva | null;
  email_facturation?: string | null;
  tel?: string | null;
  iban?: string | null;
  bic?: string | null;
  rcs_ville?: string | null;
  capital_social?: string | null;
  adresse_ligne1?: string | null;
  adresse_ligne2?: string | null;
  adresse_cp?: string | null;
  adresse_ville?: string | null;
  adresse_pays?: string | null;
}): SnapshotEmetteur {
  const regime = profile.regime_tva ?? "encaissements";
  return {
    entreprise_nom: String(profile.entreprise ?? "").trim(),
    siren: profile.siren?.trim() || null,
    siret: profile.siret?.trim() || null,
    numero_tva_intracom: profile.numero_tva_intracom?.trim() || null,
    forme_juridique: profile.forme_juridique?.trim() || null,
    regime_tva: regime,
    option_tva_debits: optionTvaDebitsFromRegime(regime),
    adresse: {
      ligne1: String(profile.adresse_ligne1 ?? "").trim(),
      ligne2: String(profile.adresse_ligne2 ?? "").trim(),
      cp: String(profile.adresse_cp ?? "").trim(),
      ville: String(profile.adresse_ville ?? "").trim(),
      pays: (String(profile.adresse_pays ?? "").trim() || "FR").toUpperCase(),
    },
    email_facturation: profile.email_facturation?.trim() || null,
    tel: profile.tel?.trim() || null,
    iban: profile.iban?.trim() || null,
    bic: profile.bic?.trim() || null,
    rcs_ville: profile.rcs_ville?.trim() || null,
    capital_social: profile.capital_social?.trim() || null,
  };
}

export function buildSnapshotClient(client: {
  nom: string;
  prenom?: string | null;
  type_client?: "particulier" | "entreprise" | "public" | null;
  siren?: string | null;
  siret?: string | null;
  tva_intracom?: string | null;
  email?: string | null;
  tel?: string | null;
  adresse_facturation?: AdresseStructuree | null;
  adresse_livraison?: AdresseStructuree | null;
}): SnapshotClient {
  return {
    nom: client.nom,
    prenom: client.prenom?.trim() || null,
    type_client: client.type_client ?? "particulier",
    siren: client.siren?.trim() || null,
    siret: client.siret?.trim() || null,
    tva_intracom: client.tva_intracom?.trim() || null,
    adresse_facturation: client.adresse_facturation ?? {
      ligne1: "",
      ligne2: "",
      cp: "",
      ville: "",
      pays: "FR",
    },
    adresse_livraison: client.adresse_livraison ?? null,
    email: client.email?.trim() || null,
    tel: client.tel?.trim() || null,
  };
}

export function deriveTypeClient(row: {
  secteur_public?: boolean | null;
  categorie_fiscale?: string | null;
}): "particulier" | "entreprise" | "public" {
  if (row.secteur_public) return "public";
  const cat = row.categorie_fiscale ?? "particulier";
  if (cat === "pro_assujetti" || cat === "pro_non_assujetti" || cat === "pro_international") {
    return "entreprise";
  }
  return "particulier";
}

export function syncCategorieFiscaleFromType(type: string, secteurPublic: boolean, current?: string | null): string {
  if (secteurPublic) return current && current !== "particulier" ? current : "pro_assujetti";
  if (type === "professionnel") {
    if (current === "pro_assujetti" || current === "pro_non_assujetti" || current === "pro_international") {
      return current;
    }
    return "pro_assujetti";
  }
  return "particulier";
}

export type { NatureOperation };

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asNullable(value: unknown): string | null {
  const s = asTrimmed(value);
  return s ? s : null;
}

function parseAdresse(raw: unknown): AdresseStructuree {
  if (!raw || typeof raw !== "object") {
    return { ligne1: "", ligne2: "", cp: "", ville: "", pays: "FR" };
  }
  const o = raw as Record<string, unknown>;
  return {
    ligne1: asTrimmed(o.ligne1),
    ligne2: asTrimmed(o.ligne2),
    cp: asTrimmed(o.cp),
    ville: asTrimmed(o.ville),
    pays: (asTrimmed(o.pays) || "FR").toUpperCase(),
  };
}

export function parseSnapshotEmetteur(raw: unknown): SnapshotEmetteur | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nom = asTrimmed(o.entreprise_nom);
  if (!nom) return null;
  return {
    entreprise_nom: nom,
    siren: asNullable(o.siren),
    siret: asNullable(o.siret),
    numero_tva_intracom: asNullable(o.numero_tva_intracom),
    forme_juridique: asNullable(o.forme_juridique),
    regime_tva: parseRegimeTva(o.regime_tva),
    option_tva_debits: Boolean(o.option_tva_debits),
    adresse: parseAdresse(o.adresse),
    email_facturation: asNullable(o.email_facturation),
    tel: asNullable(o.tel),
    iban: asNullable(o.iban),
    bic: asNullable(o.bic),
    rcs_ville: asNullable(o.rcs_ville),
    capital_social: asNullable(o.capital_social),
  };
}

export function parseSnapshotClient(raw: unknown): SnapshotClient | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nom = asTrimmed(o.nom);
  if (!nom) return null;
  const typeRaw = asTrimmed(o.type_client);
  const typeClient: SnapshotClient["type_client"] =
    typeRaw === "entreprise" || typeRaw === "public" || typeRaw === "particulier" ? typeRaw : "particulier";
  return {
    nom,
    prenom: asNullable(o.prenom),
    type_client: typeClient,
    siren: asNullable(o.siren),
    siret: asNullable(o.siret),
    tva_intracom: asNullable(o.tva_intracom),
    adresse_facturation: parseAdresse(o.adresse_facturation),
    adresse_livraison: o.adresse_livraison ? parseAdresse(o.adresse_livraison) : null,
    email: asNullable(o.email),
    tel: asNullable(o.tel),
  };
}
