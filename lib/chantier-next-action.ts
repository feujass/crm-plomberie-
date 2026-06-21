import { formatDateFr } from "@/lib/format";
import type { Chantier } from "@/types/chantiers";

function parseDue(iso: string | null | undefined) {
  const raw = iso?.trim();
  if (!raw) return null;
  const d = new Date(`${raw}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Jours jusqu’à une date YYYY-MM-DD (minuit local), négatif si passé. */
export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  const due = parseDue(iso);
  if (!due) return null;
  const t0 = new Date(now);
  t0.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - t0.getTime()) / 86400000);
}

export type NextActionDisplay = {
  /** Texte court pour listes / mobile */
  line: string;
  /** À mettre en avant (badge, couleur) */
  urgent: boolean;
};

/**
 * Prochaine action affichée : priorité au champ dédié, sinon heuristiques (relance, échéance, devis).
 */
export function chantierNextActionDisplay(c: Chantier): NextActionDisplay {
  const label = (c.next_action_label ?? "").trim();
  const naDate = (c.next_action_date ?? "").trim();
  if (label) {
    const d = naDate ? formatDateFr(naDate) : "";
    const days = daysUntil(naDate);
    const urgent =
      c.a_relancer === true ||
      (days !== null && days <= 3) ||
      (c.status === "Urgent" && days !== null && days <= 7);
    return {
      line: d ? `${label} · ${d}` : label,
      urgent,
    };
  }
  if (c.a_relancer) {
    return { line: "Relancer le client", urgent: true };
  }
  const dueDays = daysUntil(c.due_date);
  if (dueDays !== null && dueDays <= 0) {
    return { line: "Échéance dépassée — à traiter", urgent: true };
  }
  if (dueDays !== null && dueDays <= 7) {
    return { line: `Échéance dans ${dueDays} j`, urgent: dueDays <= 3 };
  }
  if (!c.devis_id?.toString().trim()) {
    return { line: "Lier un devis (facultatif)", urgent: false };
  }
  return { line: "Suivi chantier", urgent: false };
}

export function addDaysIso(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
