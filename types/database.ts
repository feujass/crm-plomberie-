export type DevisStatut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire" | "archive";
export type FactureStatut = "brouillon" | "emise" | "partielle" | "payee" | "retard";
export type ClientType = "particulier" | "professionnel";
export type OuvrageType = "main_oeuvre" | "fourniture" | "ouvrage";
export type ChantierStatut = "en_cours" | "planifie" | "termine" | "pause";
export type StructureDevis = "piece" | "type_travaux" | "libre";

export interface Profile {
  id: string;
  prenom: string | null;
  nom: string | null;
  entreprise_nom: string | null;
  logo_url: string | null;
  siret: string | null;
  adresse: string | null;
  tel: string | null;
  email_facturation: string | null;
  tva_defaut: number;
  sep_fourniture_pose: boolean;
  structure_devis: StructureDevis;
  mention_legale: string | null;
  conditions_paiement_defaut: string | null;
  onboarding_steps_completed: number;
  assistant_name: string;
  tarif_horaire: number | null;
  relance_devis_jours: number;
  relance_facture_jours: number;
  pdf_primary_color: string | null;
  notification_email: boolean;
  notification_push: boolean;
  stripe_customer_id: string | null;
  subscription_plan: "free" | "pro";
  subscription_status: string | null;
}

export interface ClientRow {
  id: string;
  user_id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  tel: string | null;
  adresse: string | null;
  type: ClientType;
  siret: string | null;
  notes: string | null;
  inactive: boolean;
  created_at: string;
}

export interface OuvrageRow {
  id: string;
  user_id: string;
  nom: string;
  description: string | null;
  type: OuvrageType;
  prix_ht: number;
  unite: string;
  tva: number;
  tags: string[] | null;
}

export interface DevisRow {
  id: string;
  user_id: string;
  client_id: string | null;
  numero: string;
  statut: DevisStatut;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  date_creation: string;
  date_envoi: string | null;
  date_expiration: string | null;
  notes: string | null;
  remise_type: "percent" | "fixed" | null;
  remise_value: number | null;
  share_token: string;
  pdf_url: string | null;
  derniere_relance_at: string | null;
  archived_at: string | null;
}

export interface DevisLigneRow {
  id: string;
  devis_id: string;
  section: string | null;
  designation: string;
  quantite: number;
  unite: string;
  prix_ht: number;
  tva: number;
  total_ht: number;
  ordre: number;
  ligne_type: "prestation" | "fourniture" | "pose";
}

export interface ChantierRow {
  id: string;
  user_id: string;
  client_id: string | null;
  devis_id: string | null;
  nom: string;
  adresse: string | null;
  statut: ChantierStatut;
  date_debut: string | null;
  date_fin: string | null;
  avancement: number;
  notes: string | null;
}

export interface FactureRow {
  id: string;
  user_id: string;
  devis_id: string | null;
  client_id: string | null;
  numero: string;
  statut: FactureStatut;
  date_emission: string;
  date_echeance: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  share_token: string;
  pdf_url: string | null;
}
