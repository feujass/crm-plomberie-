export const ANTHROPIC_LLM_NOT_CONFIGURED =
  "IA non configurée (ANTHROPIC_API_KEY manquante). Crée un devis en brouillon ou configure une clé.";

export function anthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || null;
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
}

export function anthropicDemoModel(): string {
  return process.env.ANTHROPIC_DEMO_MODEL?.trim() || "claude-haiku-4-5-20251001";
}

export function anthropicMaxTokens(): number {
  return Math.min(
    Math.max(Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096", 10) || 4096, 256),
    8192,
  );
}

export function anthropicDemoMaxTokens(): number {
  return Math.min(
    Math.max(Number.parseInt(process.env.ANTHROPIC_DEMO_MAX_TOKENS || "1024", 10) || 1024, 256),
    2048,
  );
}

/** Message lisible pour les erreurs renvoyées par l’API Anthropic. */
export function formatAnthropicError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("not_found_error") || msg.includes("404")) {
    return `Modèle Claude introuvable (${anthropicModel()}). Utilisez ANTHROPIC_MODEL=claude-sonnet-4-6 dans .env.local.`;
  }
  if (msg.includes("authentication_error") || msg.includes("401")) {
    return "Clé Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans .env.local.";
  }
  return msg.length > 240 ? "Erreur API Claude. Réessayez ou contactez le support." : msg;
}
