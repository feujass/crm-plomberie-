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

export function buildDevisGeneratePrompt(profile: BackendProfile, ouvrages: BackendOuvrage[]): string {
  const trade = metierLabel(profile);
  const catalogue = JSON.stringify(ouvrages ?? [], null, 0);
  return `Tu es un assistant expert en devis pour artisans du BTP, spécialité : ${trade}.
À partir de la description des travaux (oral ou écrit), génère un devis structuré en JSON avec la forme stricte:
{"lignes":[{"designation":"string","quantite":number,"unite":"string","prix_ht":number,"tva":number,"section":"string optionnel","ligne_type":"prestation"|"fourniture"|"pose"}]}
Utilise la bibliothèque d'ouvrages si pertinent. Prix réalistes pour le marché français.
TVA par défaut=${profile?.tva_defaut ?? 10}%. Séparation fourniture/pose=${profile?.sep_fourniture_pose ? "oui" : "non"}. Structure=${profile?.structure_devis ?? "libre"}.
Ouvrages JSON: ${catalogue}`;
}

export function buildDevisVisionPrompt(profile: BackendProfile, ouvrages: BackendOuvrage[]): string {
  const trade = metierLabel(profile);
  const catalogue = JSON.stringify(ouvrages ?? [], null, 0);
  return `Tu extrais les travaux depuis un document (photo ou PDF rendu en image) pour un artisan BTP (${trade}) et produis un devis JSON strict:
{"lignes":[{"designation":"string","quantite":number,"unite":"string","prix_ht":number,"tva":number,"section":"string optionnel","ligne_type":"prestation"|"fourniture"|"pose"}]}
TVA par défaut=${profile?.tva_defaut ?? 10}%. Séparation fourniture/pose=${profile?.sep_fourniture_pose ? "oui" : "non"}. Structure=${profile?.structure_devis ?? "libre"}.
Référence ouvrages (prix indicatifs) : ${catalogue}`;
}

export function buildAssistantChatPrompt(profile: BackendProfile, assistantName = "Zeus"): string {
  const trade = metierLabel(profile);
  return `Tu es ${assistantName}, assistant pour artisans TPE du BTP (${trade}).
Réponds en français, de façon concise et professionnelle.
Contexte utilisateur : TVA par défaut ${profile.tva_defaut ?? 10}%.
Tu aides sur devis, prix de marché, rédaction client, relances et suivi d'activité.`;
}
