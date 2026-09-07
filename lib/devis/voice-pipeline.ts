import { extractAdresseChantierFromTranscript } from "@/lib/devis/adresse-chantier";
import {
  alertPrixHorsTranscript,
  correctUnitPricesFromTranscript,
  enforceDictatedPricesFromSource,
  type PrixAlert,
} from "@/lib/devis/prix-validation";
import { applyCataloguePrices } from "@/lib/catalogue/apply-catalogue-prices";
import { usesPersonalLibrary } from "@/lib/catalogue/apply-catalogue-prices";
import { normalizeLignesWithProfile, type IaLigneLike } from "@/lib/devis-ouvrage-mode";
import { metierLabel } from "@/lib/llm/metier-labels";
import type { DevisIaResponse } from "@/lib/schemas/devis-ia";
import {
  alertTvaForLigne,
  buildTvaContextFromTranscript,
  tvaQuestionsForTranscript,
  type TvaAlert,
} from "@/lib/tva";
import { corrigerVocabulaire, SYSTEM_PROMPT_DEVIS } from "@/lib/vocabulaire-metier";
import type { BackendOuvrage, BackendProfile } from "@/types/backend";
import type { DevisLigneInput, OriginePrix } from "@/types/devis";

export type TranscriptionPrepared = {
  brut: string;
  corrige: string;
  corrections: Array<{ avant: string; apres: string }>;
};

export function prepareTranscriptionForLlm(raw: string): TranscriptionPrepared {
  const brut = raw.trim();
  const { texte, corrections } = corrigerVocabulaire(brut);
  if (corrections.length > 0) {
    console.log("[vocabulaire]", JSON.stringify(corrections));
  }
  return { brut, corrige: texte, corrections };
}

const PROMPT_APPENDIX = `
CHAMPS SUPPLÉMENTAIRES (même objet JSON racine, en plus des lignes et questions) :
{
  "adresse_chantier": "string ou null — lieu des travaux (ville, rue, code postal) si mentionné",
  "client": { "nom", "prenom", "email", "tel", "adresse" } ou null,
  "notes": "string ou null — validité, acompte, délais",
  "validite_jours": number ou null,
  "acompte_pourcent": number ou null,
  "date_expiration": "YYYY-MM-DD ou null"
}

RÈGLES ADRESSE
- Si une localisation est mentionnée ("à Caluire", "à Vénissieux", "chez M. Dupont à Lyon"), remplis adresse_chantier avec cette ville ou adresse.
- Même une ville seule ("à Caluire") suffit pour adresse_chantier.
- client.adresse = adresse postale du client si distincte du chantier, sinon null.

RÈGLES PRIX ET QUANTITÉS
- Ne remplis prix_unitaire_ht que si un montant est explicitement dicté.
- Un prix dicté explicitement ne doit jamais être arrondi ni modifié.
- prix_unitaire_ht = toujours le prix PAR unité, jamais le total (voir règle ci-dessus).
- Préfère l'unité dictée (jour, h, ml…) plutôt que de convertir silencieusement.
- Pas de champ tva dans les lignes : l'application appliquera la TVA par ligne.`;

/** Prompt système CRM (dictée / texte). */
export function buildDevisGeneratePrompt(profile: BackendProfile): string {
  const trade = metierLabel(profile);
  return `${SYSTEM_PROMPT_DEVIS}

CONTEXTE ARTISAN
Spécialité : ${trade}
${PROMPT_APPENDIX}`;
}

/** Prompt système vision (document scanné). */
export function buildDevisVisionPrompt(profile: BackendProfile): string {
  const trade = metierLabel(profile);
  return `${SYSTEM_PROMPT_DEVIS}

CONTEXTE
Tu extrais les travaux depuis un document (photo ou PDF) pour un artisan BTP (${trade}).
Reprends les prix visibles sur le document dans prix_unitaire_ht ; sinon null.
${PROMPT_APPENDIX}`;
}

/** Prompt démo publique — même garde-fous que le CRM. */
export function buildDemoDevisPrompt(): string {
  return `${SYSTEM_PROMPT_DEVIS}

CONTEXTE DÉMO
Description ORALE courte (max 8 lignes). Pas de client inventé.
${PROMPT_APPENDIX}`;
}

function prixFromIaLigne(l: DevisIaResponse["lignes"][number]): number | null {
  const raw = l.prix_ht ?? l.prix_unitaire_ht;
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  return null;
}

export function iaLignesToRaw(lignes: DevisIaResponse["lignes"]): IaLigneLike[] {
  return lignes.map((l, i) => {
    const prix = prixFromIaLigne(l);
    // Le prompt LLM n'autorise prix_unitaire_ht que si explicitement dicté.
    const origine_prix: OriginePrix = prix != null ? "dicte" : "vide";
    return {
      section: l.section,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      prix_ht: prix ?? undefined,
      tva: l.tva,
      ordre: i,
      ligne_type: l.ligne_type,
      source: l.source,
      origine_prix,
    };
  });
}

export type ProcessedIaDevis = {
  lignes: DevisLigneInput[];
  questions: string[];
  tvaAlerts: TvaAlert[];
  prixAlerts: PrixAlert[];
  adresse_chantier: string | null;
};

export function processIaDevisResponse(
  data: DevisIaResponse,
  profile: BackendProfile,
  ouvrages: BackendOuvrage[],
  transcriptCorrige: string,
): ProcessedIaDevis {
  let rawLignes = iaLignesToRaw(data.lignes);
  const prixAlerts: PrixAlert[] = [];

  const enforced = enforceDictatedPricesFromSource(rawLignes);
  rawLignes = enforced.lignes;
  prixAlerts.push(...enforced.alerts);

  const unitFixed = correctUnitPricesFromTranscript(rawLignes, transcriptCorrige);
  rawLignes = unitFixed.lignes;
  prixAlerts.push(...unitFixed.alerts);

  prixAlerts.push(...alertPrixHorsTranscript(rawLignes, transcriptCorrige));

  const withCatalogue = applyCataloguePrices(
    rawLignes,
    ouvrages,
    usesPersonalLibrary(profile),
  );

  const lignesBase = normalizeLignesWithProfile(withCatalogue, profile);
  const tvaCtx = buildTvaContextFromTranscript(transcriptCorrige);

  const tvaAlerts: TvaAlert[] = [];
  const lignes = lignesBase.map((l, i) => {
    const alert = alertTvaForLigne(l.designation, l.tva, i, tvaCtx, transcriptCorrige);
    if (alert) {
      tvaAlerts.push(alert);
      return { ...l, tva_alerte: alert.message };
    }
    return l;
  });

  const questions = [...(data.questions ?? [])];
  for (const q of tvaQuestionsForTranscript(transcriptCorrige)) {
    if (!questions.some((existing) => existing.toLowerCase() === q.toLowerCase())) {
      questions.push(q);
    }
  }
  for (const a of prixAlerts) {
    const q = a.message;
    if (!questions.some((existing) => existing.toLowerCase() === q.toLowerCase())) {
      questions.push(q);
    }
  }

  const adresseFromLlm = data.adresse_chantier?.trim() || null;
  const adresseFromTranscript = extractAdresseChantierFromTranscript(transcriptCorrige);
  const adresse_chantier = adresseFromLlm || adresseFromTranscript;

  return {
    lignes,
    questions,
    tvaAlerts,
    prixAlerts,
    adresse_chantier,
  };
}
