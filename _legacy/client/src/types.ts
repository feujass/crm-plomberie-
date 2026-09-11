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

export interface BookingRequest {
  id: number | string;
  clientId: number | string | null;
  channel: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  problemType: string;
  problemDetail: string;
  urgency: string;
  address: string;
  status: string;
  aiSuggestedSlots: { start: string; label: string }[];
  scheduledAt: string | null;
  internalNotes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InterventionReport {
  id: number | string;
  projectId: number | string | null;
  clientId: number | string | null;
  transcript: string;
  reportBody: string;
  photoUrls: string[];
  clientEmailSentAt: string | null;
  createdAt: string;
}

export interface MaterialOrderLine {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number | null;
  supplier?: string;
  notes?: string;
}

export interface MaterialOrder {
  id: number | string;
  quoteId: number | string | null;
  title: string;
  lines: MaterialOrderLine[];
  supplierNotes: string;
  status: string;
  createdAt: string;
}

export interface Warranty {
  id: number | string;
  projectId: number | string | null;
  clientId: number | string;
  label: string;
  workSummary: string;
  warrantyMonths: number;
  startDate: string;
  endDate: string;
  certificateBody: string;
  reminder30dSentAt: string | null;
  reminder7dSentAt: string | null;
  createdAt: string;
}

export interface SavTicket {
  id: number | string;
  clientId: number | string;
  warrantyId: number | string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
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
  bookingRequests: BookingRequest[];
  interventionReports: InterventionReport[];
  materialOrders: MaterialOrder[];
  warranties: Warranty[];
  savTickets: SavTicket[];
  iaHints?: { openAiConfigured: boolean; smtpConfigured: boolean };
}
