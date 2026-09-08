export type TypeLigneFacture = "bien" | "service";
export type NatureOperation = "biens" | "services" | "mixte";
export type DevisLigneType = "prestation" | "fourniture" | "pose" | string | null | undefined;

/** Mapping devis → facture : fourniture = bien, pose/prestation = service. */
export function typeLigneFromDevis(ligneType: DevisLigneType): TypeLigneFacture {
  return ligneType === "fourniture" ? "bien" : "service";
}

const BIEN_RE =
  /\b(fourniture|matériel|materiel|mitigeur|robinet|ballon|chauffe[- ]?eau|wc|sanitaire|tube|raccord|vanne|radiateur|carrelage)\b/i;

const SERVICE_RE =
  /\b(pose|dépose|depose|main[- ]?d['’]?œuvre|main[- ]?d['’]?oeuvre|déplacement|deplacement|forfait|main d)\b/i;

/** Suggestion corrigeable à la création d'une ligne (libellé). */
export function suggestTypeLigne(designation: string): TypeLigneFacture {
  const d = designation.trim();
  if (!d) return "service";
  if (SERVICE_RE.test(d) && !BIEN_RE.test(d)) return "service";
  if (BIEN_RE.test(d) && !SERVICE_RE.test(d)) return "bien";
  if (SERVICE_RE.test(d) && BIEN_RE.test(d)) return "service";
  return "service";
}

export function natureOperationFromLignes(types: TypeLigneFacture[]): NatureOperation {
  const set = new Set(types.filter(Boolean));
  if (set.size === 0) return "services";
  if (set.size === 2) return "mixte";
  return set.has("bien") ? "biens" : "services";
}
