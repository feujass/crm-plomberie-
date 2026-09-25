import type { DevisIaResponse } from "@/lib/schemas/devis-ia";

/** Construit notes client + date d’expiration à partir de l’extraction IA. */
export function buildDevisMetaFromIa(ia: Pick<
  DevisIaResponse,
  "notes" | "validite_jours" | "acompte_pourcent" | "date_expiration"
>): { notes: string; date_expiration: string | null } {
  const noteParts: string[] = [];

  if (ia.notes?.trim()) {
    noteParts.push(ia.notes.trim());
  } else {
    if (ia.validite_jours != null && ia.validite_jours > 0) {
      noteParts.push(`Devis valable ${ia.validite_jours} jours.`);
    }
    if (ia.acompte_pourcent != null && ia.acompte_pourcent > 0) {
      noteParts.push(`Acompte de ${ia.acompte_pourcent}% à la commande.`);
    }
  }

  let date_expiration: string | null = null;
  if (ia.date_expiration?.trim()) {
    date_expiration = ia.date_expiration.trim().slice(0, 10);
  } else if (ia.validite_jours != null && ia.validite_jours > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(ia.validite_jours));
    date_expiration = d.toISOString().slice(0, 10);
  }

  return {
    notes: noteParts.join(" ").trim(),
    date_expiration,
  };
}
