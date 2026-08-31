const DEFAULT_DEVIS_ECHEANCES = [3, 7, 14];
const DEFAULT_FACTURE_ECHEANCES = [0, 7, 14];

/** Parse "3, 7, 14" → [3, 7, 14] (jours entiers, ordre croissant, uniques). */
export function parseRelanceEcheances(raw: unknown, fallback: number[]): number[] {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = raw
      .split(/[,;]+/)
      .map((s) => Math.max(0, Math.floor(Number(s.trim()))))
      .filter((n) => Number.isFinite(n));
    const unique = [...new Set(parsed)].sort((a, b) => a - b);
    if (unique.length) return unique;
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return [Math.floor(raw)];
  }
  return fallback;
}

export function devisRelanceEcheances(profile: {
  relance_devis_echeances?: string | null;
  relance_devis_jours?: number | null;
}): number[] {
  const legacy =
    profile.relance_devis_jours != null && profile.relance_devis_jours >= 0
      ? [Math.floor(profile.relance_devis_jours)]
      : DEFAULT_DEVIS_ECHEANCES;
  return parseRelanceEcheances(profile.relance_devis_echeances, legacy);
}

export function factureRelanceEcheances(profile: {
  relance_facture_echeances?: string | null;
  relance_facture_jours?: number | null;
}): number[] {
  const legacy =
    profile.relance_facture_jours != null && profile.relance_facture_jours >= 0
      ? [Math.floor(profile.relance_facture_jours)]
      : DEFAULT_FACTURE_ECHEANCES;
  return parseRelanceEcheances(profile.relance_facture_echeances, legacy);
}

export function formatRelanceEcheances(days: number[]): string {
  return days.join(", ");
}

/** Date limite pour la relance d’index `count` (0-based). */
export function relanceDueAt(baseIso: string, echeances: number[], count: number): Date | null {
  if (count < 0 || count >= echeances.length) return null;
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return null;
  const due = new Date(base);
  due.setUTCDate(due.getUTCDate() + echeances[count]!);
  return due;
}

export function isRelanceDue(baseIso: string, echeances: number[], count: number, now = new Date()): boolean {
  const due = relanceDueAt(baseIso, echeances, count);
  if (!due) return false;
  return now.getTime() >= due.getTime();
}
