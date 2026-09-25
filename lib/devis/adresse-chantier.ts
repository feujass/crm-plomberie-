/** Extrait une localisation chantier depuis la dictée quand le LLM ne l'a pas remplie. */
export function extractAdresseChantierFromTranscript(transcript: string): string | null {
  const t = transcript.trim();
  if (!t) return null;

  // « à Caluire », « à Vénissieux »
  const ville =
    t.match(/(?:^|[\s,;])(?:à|a|A)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\-']+)/)?.[1]?.trim() ?? null;
  if (ville && ville.length >= 3) return ville;

  // Code postal + ville
  const cpVille = t.match(/\b(\d{5})\s+([A-ZÀ-ÿ][\wÀ-ÿ\-'\s]{2,})/)?.[0]?.trim() ?? null;
  if (cpVille) return cpVille;

  return null;
}
