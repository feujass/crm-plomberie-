/** Nom affiché de l’assistant IA Flowo (devis, chat, onboarding). */
export const ASSISTANT_DISPLAY_NAME = "Zeus";

/** Normalise les anciens profils (ex. « Rita ») vers le nom produit actuel. */
export function resolveAssistantName(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.toLowerCase() === "rita") return ASSISTANT_DISPLAY_NAME;
  return trimmed;
}
