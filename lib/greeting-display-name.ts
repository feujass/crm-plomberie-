import type { BackendMeResponse } from "@/types/backend";

const LEGACY_PLOMBI = new Set(["PlombiCRM", "Plombi CRM"]);

/**
 * Prénom puis nom pour la salutation (ton décontracté).
 * Ne remplace pas la personne par le nom du produit ; les anciens comptes « Flowo / Admin »
 * (seed) retombent sur la partie locale de l’e-mail.
 */
export function greetingDisplayName(me: BackendMeResponse): string {
  const rawPrenom = (me?.prenom ?? "").trim();
  const rawNom = (me?.nom ?? "").trim();

  const seedFlowoAdmin = rawPrenom === "Flowo" && rawNom.toLowerCase() === "admin";
  const legacyPlombi = LEGACY_PLOMBI.has(rawPrenom);
  const dropNomAdmin = rawNom.toLowerCase() === "admin";

  const prenom = seedFlowoAdmin || legacyPlombi ? "" : rawPrenom;
  const nom = dropNomAdmin ? "" : rawNom;

  const joined = [prenom, nom].filter(Boolean).join(" ").trim();
  if (joined) return joined;

  const local = me?.email?.split("@")[0]?.trim();
  return local || "toi";
}
