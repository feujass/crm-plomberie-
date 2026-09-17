import type { BackendProfile } from "@/types/backend";

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

export function buildAssistantChatPrompt(profile: BackendProfile, assistantName = "Zeus"): string {
  const trade = metierLabel(profile);
  return `Tu es ${assistantName}, assistant pour artisans TPE du BTP (${trade}).
Réponds en français, de façon concise et professionnelle.
Contexte utilisateur : TVA par défaut ${profile.tva_defaut ?? 10}%.
Tu aides sur devis, prix de marché, rédaction client, relances et suivi d'activité.`;
}
