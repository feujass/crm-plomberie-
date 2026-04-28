export type BackendUser = {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
  role?: string;
};

export type BackendProfile = {
  entreprise?: string;
  siret?: string;
  adresse?: string;
  tel?: string;
  email_facturation?: string;
  logo_url?: string;
  tva_defaut?: number;
  sep_fourniture_pose?: boolean;
  structure_devis?: string;
  mention_legale?: string;
  conditions_paiement?: string;
  onboarding_step?: number;
  onboarding_complete?: boolean;
};

export type BackendMeResponse = BackendUser & {
  profile?: BackendProfile;
};

export type BackendDevis = {
  id: string;
  numero?: string;
  statut?: string;
  client_nom?: string;
  total_ttc?: number;
  created_at?: string;
};

export type BackendDashboardStats = {
  devis_du_mois: number;
  taux_acceptation: number;
  ca_mois: number;
  montant_attente: number;
  montant_impaye: number;
  client_count: number;
  recent_devis: BackendDevis[];
  relances: BackendDevis[];
};

export type BackendClient = {
  id: string;
  nom: string;
  prenom?: string;
  email?: string;
  tel?: string;
  adresse?: string;
  type?: "particulier" | "professionnel" | string;
  siret?: string;
  notes?: string;
  inactive?: boolean;
  created_at?: string;
};

export type BackendFacture = {
  id: string;
  numero?: string;
  statut?: string;
  total_ttc?: number;
  date_emission?: string;
  created_at?: string;
  client_id?: string;
  client_nom?: string;
};

export type BackendPaiement = {
  id: string;
  montant: number;
  date?: string;
  mode?: string;
};

export type BackendFactureDetail = BackendFacture & {
  devis_id?: string;
  lignes?: BackendDevisLine[];
  total_ht?: number;
  total_tva?: number;
  notes?: string;
  date_echeance?: string;
  paiements?: BackendPaiement[];
  montant_paye?: number;
};

export type BackendClientDetail = BackendClient & {
  devis_count?: number;
  factures_count?: number;
  ca_total?: number;
  devis?: BackendDevis[];
  factures?: BackendFacture[];
};

export type BackendOuvrage = {
  id: string;
  nom: string;
  description?: string;
  type?: "main_oeuvre" | "fourniture" | "ouvrage" | string;
  prix_ht?: number;
  unite?: string;
  tva?: number;
  tags?: string[];
  created_at?: string;
};

export type BackendDevisLine = {
  section?: string;
  designation: string;
  quantite?: number;
  unite?: string;
  prix_ht?: number;
  tva?: number;
  total_ht?: number;
};

export type BackendDevisDetail = BackendDevis & {
  client_id?: string;
  lignes?: BackendDevisLine[];
  notes?: string;
  date_expiration?: string;
  remise_type?: string;
  remise_valeur?: number;
  total_ht?: number;
  total_tva?: number;
};

