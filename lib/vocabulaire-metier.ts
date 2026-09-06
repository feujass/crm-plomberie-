/**
 * Flowo — Correction du vocabulaire métier après transcription vocale.
 *
 * Ordre d'application :
 *   1. STT_PROMPT est envoyé au moteur de transcription (Whisper / Scribe / Deepgram)
 *   2. corrigerVocabulaire() nettoie la transcription reçue
 *   3. Le texte corrigé est envoyé à Claude avec SYSTEM_PROMPT_DEVIS
 */

// ---------------------------------------------------------------------------
// 1. DICTIONNAIRE MÉTIER
// ---------------------------------------------------------------------------

/** Marques : forme correcte -> variantes phonétiques entendues par le STT */
export const MARQUES: Record<string, string[]> = {
  "Saunier Duval": [
    "sony duval",
    "sonier duval",
    "saunié duval",
    "sonny duval",
    "sauner duval",
    "sonnier duval",
    "saunier duvale",
    "so nier duval",
  ],
  Vaillant: ["vaillant", "vayant", "vaillante", "valiant", "veillant"],
  "De Dietrich": [
    "de dietrich",
    "de diétriche",
    "de ditrich",
    "dediétrich",
    "de dietriche",
    "dedietrich",
  ],
  Frisquet: ["frisquet", "frisket", "friskette", "frisquette"],
  "Elm Leblanc": ["elm leblanc", "elm le blanc", "aime leblanc", "l m leblanc"],
  Chappée: ["chappée", "chapée", "chapé", "chappe"],
  Atlantic: ["atlantic", "atlantique"],
  Thermor: ["thermor", "termor", "thermore"],
  Viessmann: ["viessmann", "vissman", "viesman", "wiessmann", "vismann"],
  Bosch: ["bosch", "bosh", "boch"],
  Ariston: ["ariston", "aristone"],
  Daikin: ["daikin", "daïkin", "daykin", "dakin"],
  Grohe: ["grohe", "grohé", "gro hé", "groé"],
  Geberit: ["geberit", "géberit", "gébérite", "jeberit"],
  Hansgrohe: ["hansgrohe", "hans grohe", "ans grohé"],
  "Jacob Delafon": ["jacob delafon", "jacob de la fon", "jacob delafond"],
  Roca: ["roca", "roka"],
  "Villeroy & Boch": ["villeroy et boch", "villeroy boch", "villroy et bosh"],
  Rothenberger: ["rothenberger", "rotenberger", "rotenbergeur"],
  Rehau: ["rehau", "réhau", "ré o", "reho"],
  Uponor: ["uponor", "uponore", "u ponor"],
  Watts: ["watts", "watt", "ouatt"],
  Danfoss: ["danfoss", "dan foss", "danfosse"],
  Oertli: ["oertli", "eurtli", "ortli"],
  Auer: ["auer", "auère", "au air"],
  Panasonic: ["panasonic", "panasonique"],
  Mitsubishi: ["mitsubishi", "mitsubichi", "mitsoubishi"],
  Sauermann: ["sauermann", "sauerman", "sowerman"],
};

/** Termes techniques : forme correcte -> variantes entendues */
export const TERMES_TECHNIQUES: Record<string, string[]> = {
  tubage: ["tubage", "tue bagage", "tu bage", "tubages"],
  ventouse: ["ventouse", "vent house", "ventouze"],
  désembouage: [
    "désembouage",
    "des embouage",
    "désamboigage",
    "dés embouage",
    "desembouage",
    "désembouages",
  ],
  dégazage: ["dégazage", "des gazage", "dégazages"],
  "groupe de sécurité": ["groupe de sécurité", "groupe sécurité"],
  "vase d'expansion": ["vase d'expansion", "vase expansion", "vaz d'expansion"],
  PER: ["per", "p e r", "père", "pair"],
  multicouche: ["multicouche", "multi couche", "multicouches"],
  "cuivre recuit": ["cuivre recuit", "cuivre requit", "cuivre recuis"],
  "PVC évacuation": ["pvc évacuation", "p v c évacuation"],
  "chaudière à condensation": [
    "chaudière à condensation",
    "chaudière condensation",
    "chaudiere a condensation",
  ],
  "chauffe-eau thermodynamique": [
    "chauffe eau thermodynamique",
    "chauffe-eau thermo",
    "chauffeau thermodynamique",
  ],
  "ballon d'eau chaude": ["ballon d'eau chaude", "ballon eau chaude", "balon d'eau chaude"],
  "pompe à chaleur": ["pompe à chaleur", "pompe a chaleur", "pac", "p a c"],
  "plancher chauffant": ["plancher chauffant", "planché chauffant"],
  "robinet thermostatique": ["robinet thermostatique", "robinet thermostat"],
  "mitigeur thermostatique": ["mitigeur thermostatique", "mitigeur thermostat"],
  "colonne montante": ["colonne montante", "colone montante"],
  purge: ["purge", "purges", "pürge"],
  détartrage: ["détartrage", "de tartrage", "détartrages"],
  adoucisseur: ["adoucisseur", "adoucisseurs", "a doucisseur"],
  "clapet anti-retour": ["clapet anti retour", "clapé anti retour", "clapet antiretour"],
  "raccord olive": ["raccord olive", "racor olive"],
  sertissage: ["sertissage", "sertisage", "certissage"],
  "évacuation eaux usées": ["évacuation eaux usées", "évacuation eau usée"],
  siphon: ["siphon", "sifon", "syphon"],
  "WC suspendu": ["wc suspendu", "double v c suspendu", "vécé suspendu"],
  "bâti-support": ["bâti support", "bati support", "batisupport"],
  "receveur de douche": ["receveur de douche", "receveur douche", "recepteur de douche"],
  "mise en service": ["mise en service", "mise en cervice"],
  "certificat de conformité": ["certificat de conformité", "certificat conformité"],
};

// ---------------------------------------------------------------------------
// 2. PROMPT POUR LE MOTEUR DE TRANSCRIPTION
// ---------------------------------------------------------------------------

/**
 * À passer au STT.
 * - Whisper (OpenAI) : paramètre `prompt` (~224 tokens max, garde-le court)
 * - ElevenLabs Scribe : `keyterms`
 * - Deepgram Nova-3 : un `keyterm` par entrée
 */
export const STT_PROMPT = [
  "Devis de plomberie et chauffage en France.",
  "Marques : Saunier Duval, Vaillant, De Dietrich, Frisquet, Elm Leblanc,",
  "Chappée, Atlantic, Thermor, Viessmann, Bosch, Ariston, Daikin, Grohe,",
  "Geberit, Jacob Delafon, Rehau, Uponor.",
  "Termes : tubage, ventouse, désembouage, dégazage, groupe de sécurité,",
  "vase d'expansion, PER, multicouche, chaudière à condensation,",
  "chauffe-eau thermodynamique, pompe à chaleur, bâti-support, sertissage.",
].join(" ");

/** Liste plate, pour les moteurs qui attendent des mots-clés séparés */
export const STT_KEYTERMS: string[] = [...Object.keys(MARQUES), ...Object.keys(TERMES_TECHNIQUES)];

// ---------------------------------------------------------------------------
// 3. CORRECTION DÉTERMINISTE DE LA TRANSCRIPTION
// ---------------------------------------------------------------------------

const sansAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Échappe les caractères spéciaux regex */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Remplacement = { motif: RegExp; correct: string };

/** Construit la table de remplacement une seule fois au chargement du module */
const REMPLACEMENTS: Remplacement[] = (() => {
  const entrees: Remplacement[] = [];

  for (const [correct, variantes] of Object.entries({
    ...MARQUES,
    ...TERMES_TECHNIQUES,
  })) {
    for (const variante of variantes) {
      const motif = sansAccents(variante)
        .split(/\s+/)
        .map((mot) =>
          escapeRegex(mot).replace(/[aeiouc]/g, (c) => {
            const equivalents: Record<string, string> = {
              a: "[aàâä]",
              e: "[eéèêë]",
              i: "[iîï]",
              o: "[oôö]",
              u: "[uùûü]",
              c: "[cç]",
            };
            return equivalents[c] ?? c;
          }),
        )
        .join("\\s+");

      entrees.push({
        motif: new RegExp(`\\b${motif}\\b`, "gi"),
        correct,
      });
    }
  }

  return entrees.sort((a, b) => b.motif.source.length - a.motif.source.length);
})();

export type ResultatCorrection = {
  texte: string;
  corrections: Array<{ avant: string; apres: string }>;
};

/**
 * Corrige le vocabulaire métier dans une transcription.
 * Purement déterministe : ne peut ni inventer ni supprimer de contenu.
 */
export function corrigerVocabulaire(transcription: string): ResultatCorrection {
  let texte = transcription;
  const corrections: Array<{ avant: string; apres: string }> = [];

  for (const { motif, correct } of REMPLACEMENTS) {
    texte = texte.replace(motif, (trouve) => {
      if (trouve !== correct) {
        corrections.push({ avant: trouve, apres: correct });
      }
      return correct;
    });
  }

  return { texte, corrections };
}

// ---------------------------------------------------------------------------
// 4. PROMPT SYSTÈME CLAUDE
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT_DEVIS = `Tu rédiges des devis pour des plombiers-chauffagistes indépendants en France, à partir d'une description dictée à voix haute puis transcrite.

RÈGLE ABSOLUE — N'INVENTE JAMAIS DE LIGNE
Un devis signé engage juridiquement l'artisan. Une prestation que tu ajoutes de ta propre initiative peut l'obliger à réaliser gratuitement un travail qu'il n'a jamais chiffré.
- Ne crée une ligne que si la prestation, la fourniture ou la main d'œuvre correspondante est explicitement présente dans la description.
- N'ajoute jamais une prestation parce qu'elle est "habituelle", "logique" ou "généralement incluse" dans ce type de chantier.
- Si un élément est ambigu ou incomplet, ne devine pas : signale-le dans le champ "questions" prévu à cet effet.
- Si un prix n'est pas donné, laisse le montant à null. N'estime jamais un tarif.

ORTHOGRAPHE DES MARQUES
La transcription vocale déforme régulièrement les noms de marques. Écris-les exactement ainsi :
Saunier Duval, Vaillant, De Dietrich, Frisquet, Elm Leblanc, Chappée, Atlantic, Thermor, Viessmann, Bosch, Ariston, Daikin, Grohe, Geberit, Hansgrohe, Jacob Delafon, Roca, Villeroy & Boch, Rehau, Uponor, Watts, Danfoss, Oertli, Auer, Panasonic, Mitsubishi.

Si la transcription contient un nom proche mais incorrect ("Sony Duval", "Vissman", "Daïkin"), corrige-le vers la marque réelle de la liste. Ne remplace jamais une marque par une autre marque différente. Si le nom entendu ne ressemble à aucune marque connue, conserve-le tel quel et signale-le dans "questions".

VOCABULAIRE TECHNIQUE
Termes fréquemment mal transcrits, à rétablir : tubage, ventouse, désembouage, dégazage, groupe de sécurité, vase d'expansion, PER, multicouche, bâti-support, sertissage, chaudière à condensation, chauffe-eau thermodynamique, pompe à chaleur, plancher chauffant, adoucisseur, détartrage, clapet anti-retour.

FORMAT DE SORTIE
Réponds uniquement en JSON valide, sans texte autour et sans balises Markdown :
{
  "lignes": [
    {
      "designation": "string",
      "quantite": number,
      "unite": "forfait" | "u" | "ml" | "m2" | "h",
      "prix_unitaire_ht": number | null,
      "source": "string — l'extrait exact de la description qui justifie cette ligne"
    }
  ],
  "questions": ["string — points ambigus à faire confirmer par l'artisan"]
}

Le champ "source" est obligatoire pour chaque ligne : c'est la preuve que la ligne vient bien de la dictée. Si tu ne peux pas citer d'extrait, la ligne ne doit pas exister.`;
