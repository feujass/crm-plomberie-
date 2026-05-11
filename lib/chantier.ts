export type EtapeMetier =
  | "terrassement"
  | "maconnerie"
  | "plomberie"
  | "electricite"
  | "finitions"
  | "reception_client";

export type ChantierTypeKey = "piscine" | "salle_de_bain" | "plomberie" | "electricite" | "autre";

export const ETAPES_METIER: EtapeMetier[] = [
  "terrassement",
  "maconnerie",
  "plomberie",
  "electricite",
  "finitions",
  "reception_client",
];

export const ETAPE_LABELS: Record<EtapeMetier, string> = {
  terrassement: "Terrassement",
  maconnerie: "Maçonnerie",
  plomberie: "Plomberie",
  electricite: "Électricité",
  finitions: "Finitions",
  reception_client: "Réception client",
};

export const CHANTIER_TYPES: { value: ChantierTypeKey; label: string }[] = [
  { value: "piscine", label: "Piscine" },
  { value: "salle_de_bain", label: "Salle de bain" },
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "autre", label: "Autre" },
];

export const CHANTIER_STATUS = ["Planifié", "En cours", "Urgent", "Terminé"] as const;
export type ChantierStatus = (typeof CHANTIER_STATUS)[number];

/** Comparaison à minuit local, même convention que les alertes chantiers (`due_date` + `T12:00:00`). */
export function isChantierDueDateStrictlyPast(dueDate: string | null | undefined, now = new Date()): boolean {
  const raw = dueDate?.trim();
  if (!raw) return false;
  const due = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function isChantierInTermineListSegment(c: {
  status?: string | null;
  due_date?: string | null;
}): boolean {
  if ((c.status ?? "").trim() === "Terminé") return true;
  return isChantierDueDateStrictlyPast(c.due_date);
}

