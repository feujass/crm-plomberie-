export type EtapeMetier =
  | "terrassement"
  | "maconnerie"
  | "plomberie"
  | "electricite"
  | "finitions"
  | "reception_client";

export type ChantierTypeKey = "piscine" | "salle_de_bain" | "plomberie" | "electricite" | "autre";

export interface Client {
  id: number | string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  segment: string;
  lastProject: string;
  notes: string;
  notesUpdatedAt: string | null;
}

export interface Service {
  id: number | string;
  name: string;
  basePrice: number;
}

export interface Quote {
  id: number | string;
  clientId: number | string;
  serviceId: number | string;
  materialId: number | string;
  hours: number;
  discount: number;
  amount: number;
  status: string;
  sentAt: string;
  ack: boolean;
  materialsDesc: string;
  materialsTotal: number;
  acceptedAt: string | null;
  /** Horodatage de la seule relance e-mail automatique (signature), si envoyée. */
  relanceEnvoyeeAt: string | null;
  quoteRef: string;
  /** URL publique du PDF dans le bucket Supabase (peut 404 si jamais généré). */
  pdfPublicUrl: string;
}

export interface Project {
  id: number | string;
  name: string;
  clientId: number | string;
  status: string;
  progress: number;
  dueDate: string;
  responsible: string;
  comment: string;
  siteAddress: string;
  chantierType: string;
  quoteId: number | string | null;
  budgetEstime: number;
  heuresPrevues: number;
  heuresPassees: number;
  etapeMetier: EtapeMetier;
  photoUrls: string[];
  aRelancer: boolean;
}

export interface AppUser {
  id: number | string;
  email: string;
  name: string;
  initials: string;
}

export interface BootstrapData {
  clients: Client[];
  services: Service[];
  materials: { id: number | string; name: string; price: number }[];
  quotes: Quote[];
  projects: Project[];
  notifications: { id: number | string; label: string; type: string }[];
  integrations: { id: number | string; name: string; description: string; enabled: boolean }[];
  laborRate: number;
}
