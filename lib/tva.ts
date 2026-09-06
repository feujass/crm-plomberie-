/**
 * Règles TVA travaux BTP — France (mise à jour sept. 2026).
 *
 * Sources :
 * - Remplacement chaudière gaz au taux normal 20 % depuis le 1er mars 2025
 *   (loi de finances 2025, fin du taux réduit 5,5 % / 10 % sur le remplacement).
 * - Équipements décarbonés / isolation : 5,5 % en logement > 2 ans.
 * - Autres rénovations entretien : 10 % en logement > 2 ans.
 * - Neuf ou logement < 2 ans : 20 %.
 *
 * Ce module centralise la détection et les alertes — pas de valeur par défaut silencieuse
 * en cas de doute (remonter dans `questions` côté LLM).
 */

export type TvaAlert = {
  ligneIndex: number;
  designation: string;
  tauxApplique: number;
  message: string;
};

export type TvaContext = {
  /** Logement de plus de 2 ans (null = inconnu) */
  logementPlusDe2Ans?: boolean | null;
  /** Entretien d'une chaudière déjà installée (vs remplacement) */
  entretienChaudiere?: boolean;
  /** Chaudière gaz THPE déjà en place (entretien) */
  chaudiereThpe?: boolean;
};

type TvaCategory =
  | "chaudiere_gaz_remplacement"
  | "equipement_decarbonise"
  | "renovation_entretien"
  | "neuf"
  | "entretien_chaudiere_gaz_thpe"
  | "entretien_chaudiere_gaz"
  | "inconnu";

const CHAUDIERE_GAZ =
  /chaudi[eè]re.*(gaz|gazoil)|remplacement.*chaudi[eè]re|chaudi[eè]re.*(condensation|murale|thpe)|\bcondensation\b.*chaudi[eè]re/i;
const ENTRETIEN_CHAUDIERE = /entretien.*chaudi[eè]re|maintenance.*chaudi[eè]re|r[eé]vision.*chaudi[eè]re/i;
const DECARBONISE =
  /pompe [àa] chaleur|\bpac\b|biomasse|granul[eé]|solaire thermique|chauffe-eau thermodynamique|isolation|ite\b|iti\b|doublage isolant/i;
const RENOVATION_ENTRETIEN =
  /plomberie|sanitaire|d[eé]pannage|r[eé]paration|d[eé]sembouage|d[eé]tartrage|robinet|mitigeur|wc\b|douche|salle de bain|tubage|ventouse/i;

/** Taux attendu selon la prestation détectée (null si ambigu). */
export function expectedTvaRate(designation: string, ctx: TvaContext = {}, transcript = ""): number | null {
  const d = designation.trim();
  if (!d) return null;

  const cat = categorizePrestation(d, ctx, transcript);
  switch (cat) {
    case "chaudiere_gaz_remplacement":
      return 20;
    case "equipement_decarbonise":
      return ctx.logementPlusDe2Ans === false ? 20 : ctx.logementPlusDe2Ans === true ? 5.5 : null;
    case "entretien_chaudiere_gaz_thpe":
      return ctx.logementPlusDe2Ans === false ? 20 : 5.5;
    case "entretien_chaudiere_gaz":
      return ctx.logementPlusDe2Ans === false ? 20 : 10;
    case "renovation_entretien":
      return ctx.logementPlusDe2Ans === false ? 20 : ctx.logementPlusDe2Ans === true ? 10 : null;
    case "neuf":
      return 20;
    default:
      return null;
  }
}

/** Contexte TVA déduit de la dictée complète (pas seulement la désignation ligne). */
export function buildTvaContextFromTranscript(transcript: string): TvaContext {
  const t = transcript.toLowerCase();
  const ctx: TvaContext = {};

  if (/(plus de 2 ans|logement ancien|ancien logement)/i.test(t)) ctx.logementPlusDe2Ans = true;
  if (/(moins de 2 ans|construction neuve|logement neuf|neuf)/i.test(t)) ctx.logementPlusDe2Ans = false;
  if (/entretien.*chaudi[eè]re|maintenance.*chaudi[eè]re|r[eé]vision.*chaudi[eè]re/i.test(t)) {
    ctx.entretienChaudiere = true;
  }
  if (/thpe/i.test(t)) ctx.chaudiereThpe = true;

  return ctx;
}

export function isChaudiereGazPrestation(designation: string, transcript: string): boolean {
  if (CHAUDIERE_GAZ.test(designation)) return true;
  if (/chaudi[eè]re/i.test(designation) && CHAUDIERE_GAZ.test(transcript)) return true;
  if (/condensation|gaz|thpe|murale/i.test(designation) && /chaudi[eè]re.*(gaz|condensation)|gaz.*chaudi[eè]re/i.test(transcript)) {
    return true;
  }
  return false;
}

function categorizePrestation(designation: string, ctx: TvaContext, transcript = ""): TvaCategory {
  const d = designation.toLowerCase();

  if (ctx.entretienChaudiere || ENTRETIEN_CHAUDIERE.test(designation)) {
    if (ctx.chaudiereThpe || /thpe/i.test(d)) return "entretien_chaudiere_gaz_thpe";
    return "entretien_chaudiere_gaz";
  }

  if (isChaudiereGazPrestation(designation, transcript) && !ENTRETIEN_CHAUDIERE.test(designation)) {
    return "chaudiere_gaz_remplacement";
  }

  if (CHAUDIERE_GAZ.test(designation) && !ENTRETIEN_CHAUDIERE.test(designation)) {
    return "chaudiere_gaz_remplacement";
  }

  if (DECARBONISE.test(designation)) return "equipement_decarbonise";

  if (ctx.logementPlusDe2Ans === false) return "neuf";

  if (RENOVATION_ENTRETIEN.test(designation)) return "renovation_entretien";

  return "inconnu";
}

/** Alerte non bloquante si le taux appliqué contredit la prestation. */
export function alertTvaForLigne(
  designation: string,
  tauxApplique: number,
  ligneIndex: number,
  ctx: TvaContext = {},
  transcript = "",
): TvaAlert | null {
  const expected = expectedTvaRate(designation, ctx, transcript);
  if (expected == null) return null;

  const applied = Math.round(tauxApplique * 10) / 10;
  const exp = Math.round(expected * 10) / 10;
  if (Math.abs(applied - exp) < 0.01) return null;

  let message: string;
  if (expected === 20 && isChaudiereGazPrestation(designation, transcript)) {
    message =
      "Depuis mars 2025, le remplacement d'une chaudière gaz (classique, condensation ou THPE) est soumis à 20 % (fourniture et pose). Vérifie le taux appliqué.";
  } else if (expected === 5.5) {
    message = `Pour cette prestation, le taux réduit de 5,5 % s'applique généralement en logement de plus de 2 ans. Taux actuel : ${applied} %.`;
  } else if (expected === 10) {
    message = `Pour cette prestation de rénovation/entretien, le taux de 10 % est courant en logement de plus de 2 ans. Taux actuel : ${applied} %.`;
  } else {
    message = `Taux attendu environ ${exp} % pour « ${designation.slice(0, 60)}… ». Taux actuel : ${applied} %.`;
  }

  return { ligneIndex, designation, tauxApplique: applied, message };
}

/** Questions TVA à ajouter quand l'âge du logement est inconnu pour une prestation sensible. */
export function tvaQuestionsForTranscript(transcript: string): string[] {
  const questions: string[] = [];
  const t = transcript.toLowerCase();

  const needsAge =
    DECARBONISE.test(transcript) ||
    CHAUDIERE_GAZ.test(transcript) ||
    RENOVATION_ENTRETIEN.test(transcript);

  if (needsAge && !/(plus de 2 ans|moins de 2 ans|neuf|construction neuve|r[eé]cent)/i.test(t)) {
    questions.push("Quel est l'âge du logement (plus ou moins de 2 ans) pour appliquer le bon taux de TVA ?");
  }

  if (CHAUDIERE_GAZ.test(transcript) && ENTRETIEN_CHAUDIERE.test(transcript)) {
    questions.push("S'agit-il d'un remplacement de chaudière ou d'un simple entretien ?");
  }

  return questions;
}
