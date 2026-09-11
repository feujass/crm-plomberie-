/** Détail d’erreur FastAPI (chaîne ou liste de validations Pydantic). */
export function fastApiDetailMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const d = (payload as Record<string, unknown>).detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0];
    if (first && typeof first === "object") {
      const msg = (first as Record<string, unknown>).msg;
      if (typeof msg === "string") return msg;
    }
  }
  return null;
}
