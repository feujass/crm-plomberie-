import { formatOuvragesForPrompt, usesPersonalLibrary } from "@/lib/catalogue/apply-catalogue-prices";
import type { BackendOuvrage, BackendProfile } from "@/types/backend";

const METIER_LABELS: Record<string, string> = {
  plombier: "plomberie et chauffage",
  electricien: "électricité",
  carreleur: "carrelage et revêtements",
  peintre: "peinture et finitions",
  macon: "maçonnerie",
  multi_metiers: "plusieurs corps d'état du BTP",
  artisan_btp: "artisanat du bâtiment (BTP)",
  autre: "artisanat du bâtiment",
};

export function metierLabel(profile: BackendProfile): string {
  const key = (profile.metier ?? "artisan_btp").trim().toLowerCase();
  if (profile.specialites?.trim()) return profile.specialites.trim();
  return METIER_LABELS[key] ?? METIER_LABELS.artisan_btp;
}

function catalogueInstructions(profile: BackendProfile, ouvrages: BackendOuvrage[]): string {
  const catalogue = formatOuvragesForPrompt(ouvrages);
  const libraryOn = usesPersonalLibrary(profile);

  if (!libraryOn || ouvrages.length === 0) {
    return `Bibliothèque personnelle : inactive ou vide. Utilise des prix réalistes pour le marché français (fourchettes courantes BTP).
Catalogue JSON: ${catalogue}`;
  }

  return `Bibliothèque personnelle ACTIVE — règles strictes sur les prix :
1. Pour chaque ligne, cherche d'abord une correspondance dans le catalogue (nom, tags, type fourniture/main_oeuvre/ouvrage).
2. Si un article du catalogue correspond (ex. robinet, chauffe-eau, taux horaire), reprends EXACTEMENT son prix_ht, unite et tva — ne les invente pas.
3. Utilise le champ "nom" du catalogue comme designation lorsque tu fais correspondre un article.
4. N'invente un prix que pour une prestation absente du catalogue (travaux atypiques, forfait sur mesure).
5. Les entrées type "fourniture" = matériaux ; "main_oeuvre" = MO ; "ouvrage" = prestation forfaitaire.
Catalogue JSON (prix officiels de l'artisan): ${catalogue}`;
}

export function buildDevisGeneratePrompt(profile: BackendProfile, ouvrages: BackendOuvrage[]): string {
  const trade = metierLabel(profile);
  return `Tu es un assistant expert en devis pour artisans du BTP, spécialité : ${trade}.
À partir de la description des travaux (oral ou écrit), génère un devis structuré en JSON strict:
{"lignes":[...],"adresse_chantier":"string ou null","client":{...},"notes":"string ou null","validite_jours":number ou null,"acompte_pourcent":number ou null,"date_expiration":"YYYY-MM-DD ou null"}
Chaque élément de "lignes" DOIT être un objet avec des nombres (pas de strings) :
{"designation":"string","quantite":number,"unite":"string","prix_ht":number,"tva":number,"section":"string ou null","ligne_type":"prestation"|"fourniture"|"pose"|null}
Exemple ligne : {"designation":"Pose robinet mitigeur","quantite":1,"unite":"u","prix_ht":85,"tva":10,"ligne_type":"prestation"}
Règles client & adresse :
- Si un nom/prénom de client est mentionné, remplis client.nom et client.prenom (nom = nom de famille).
- adresse_chantier = lieu des travaux / chantier (rue, ville, code postal).
- client.adresse = adresse postale du client si distincte du chantier, sinon null.
- Si une seule adresse est donnée pour les travaux, mets-la dans adresse_chantier.
- null pour les champs non mentionnés (ne pas inventer).
Règles conditions & validité (notes visibles client) :
- Reprends fidèlement validité du devis, acompte, délais, modalités de paiement dites par l'artisan.
- Ex. « valable 30 jours » → validite_jours=30 et notes contenant cette phrase.
- Ex. « acompte 30% » → acompte_pourcent=30 et notes contenant cette phrase.
- notes = texte lisible pour le client (1-3 phrases max), en français.
TVA par défaut=${profile?.tva_defaut ?? 10}%. Séparation fourniture/pose=${profile?.sep_fourniture_pose ? "oui" : "non"}. Structure=${profile?.structure_devis ?? "libre"}.
${catalogueInstructions(profile, ouvrages)}`;
}

export function buildDevisVisionPrompt(profile: BackendProfile, ouvrages: BackendOuvrage[]): string {
  const trade = metierLabel(profile);
  return `Tu extrais les travaux depuis un document (photo ou PDF rendu en image) pour un artisan BTP (${trade}) et produis un devis JSON strict:
{"lignes":[...],"adresse_chantier":"string ou null","client":{...},"notes":"string ou null","validite_jours":number ou null,"acompte_pourcent":number ou null,"date_expiration":"YYYY-MM-DD ou null"}
Extrais client, adresse_chantier et conditions (validité, acompte) si visibles ou mentionnés, sinon null.
TVA par défaut=${profile?.tva_defaut ?? 10}%. Séparation fourniture/pose=${profile?.sep_fourniture_pose ? "oui" : "non"}. Structure=${profile?.structure_devis ?? "libre"}.
${catalogueInstructions(profile, ouvrages)}`;
}

export function buildAssistantChatPrompt(profile: BackendProfile, assistantName = "Zeus"): string {
  const trade = metierLabel(profile);
  return `Tu es ${assistantName}, assistant pour artisans TPE du BTP (${trade}).
Réponds en français, de façon concise et professionnelle.
Contexte utilisateur : TVA par défaut ${profile.tva_defaut ?? 10}%.
Tu aides sur devis, prix de marché, rédaction client, relances et suivi d'activité.`;
}
