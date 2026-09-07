import type { BackendProfile } from "@/types/backend";
import type { DevisLigneInput } from "@/types/devis";

/** TVA par défaut issue du profil (Assistant / Compte). */
export function defaultTvaFromProfile(profile: BackendProfile | undefined): number {
  const v = profile?.tva_defaut;
  if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100) return v;
  return 10;
}

/**
 * Section suggérée quand `structure_devis` impose un regroupement et que la ligne n’a pas de section.
 */
export function defaultSectionForStructure(structure: string | undefined | null, index: number): string {
  const s = (structure ?? "libre").trim();
  if (s === "piece") return "Pièce";
  if (s === "type_travaux") {
    const corps = ["Sanitaire", "Chauffage", "Réseaux & distribution", "Autre"];
    return corps[Math.min(index, corps.length - 1)] ?? "Autre";
  }
  return "";
}

export type IaLigneLike = {
  section?: string | null;
  designation: string;
  quantite?: number;
  unite?: string;
  prix_ht?: number | null;
  tva?: number;
  ordre?: number;
  ligne_type?: string;
  source?: string | null;
  origine_prix?: "dicte" | "prereglage" | "vide" | null;
  catalogue_ouvrage_id?: string | null;
  tva_alerte?: string | null;
};

/**
 * Applique les réglages « mode devis » du profil aux lignes issues de l’IA ou d’un import :
 * TVA par défaut si absente / invalide, section si la structure l’exige, type de ligne cohérent avec la séparation fourniture/pose.
 */
export function normalizeLignesWithProfile(lignes: IaLigneLike[], profile: BackendProfile | undefined): DevisLigneInput[] {
  const tvaDef = defaultTvaFromProfile(profile);
  const structure = profile?.structure_devis ?? "libre";
  const sep = Boolean(profile?.sep_fourniture_pose);

  return lignes.map((l, i) => {
    const rawTva = l.tva;
    const tva =
      typeof rawTva === "number" && Number.isFinite(rawTva) && rawTva > 0 && rawTva <= 100 ? rawTva : tvaDef;

    let section = (l.section ?? "").trim();
    if (!section && structure !== "libre") {
      section = defaultSectionForStructure(structure, i);
    }

    let ligne_type: DevisLigneInput["ligne_type"] = "prestation";
    const lt = (l.ligne_type ?? "").toLowerCase();
    if (lt === "fourniture" || lt === "pose" || lt === "prestation") {
      ligne_type = lt;
    } else if (sep) {
      const d = `${l.designation}`.toLowerCase();
      if (/(fourniture|matériau|mitigeur|wc\s|carrelage|mécanisme)/i.test(d)) ligne_type = "fourniture";
      else if (/(pose|main d|main-d|mise en œuvre|dépose|raccord)/i.test(d)) ligne_type = "pose";
    }

    const rawPrix = l.prix_ht;
    const prix_ht =
      typeof rawPrix === "number" && Number.isFinite(rawPrix) && rawPrix >= 0 ? rawPrix : 0;

    let origine_prix = l.origine_prix ?? null;
    if (!origine_prix && prix_ht > 0) origine_prix = null;
    if (!origine_prix && prix_ht <= 0) origine_prix = "vide";

    return {
      section: section || null,
      designation: l.designation,
      quantite: Number(l.quantite ?? 1) || 1,
      unite: String(l.unite ?? "u").trim() || "u",
      prix_ht,
      tva,
      ordre: typeof l.ordre === "number" ? l.ordre : i,
      ligne_type,
      source: l.source ?? null,
      origine_prix,
      catalogue_ouvrage_id: l.catalogue_ouvrage_id ?? null,
      tva_alerte: l.tva_alerte ?? null,
    };
  });
}
