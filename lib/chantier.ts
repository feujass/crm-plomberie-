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

