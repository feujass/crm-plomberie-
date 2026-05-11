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
  siren?: string;
  forme_juridique?: string;
  capital_social?: string;
  rcs_ville?: string;
  numero_tva_intracom?: string;
  tva_sur_encaissements?: boolean;
  tva_sur_debits_opt_in?: boolean;
  decennale_mention?: string;
  iban?: string;
  bic?: string;
  adresse?: string;
  tel?: string;
  email_facturation?: string;
  logo_url?: string;
  avatar_url?: string;
  /** Domaines d’intervention / corps d’état (texte libre). */
  specialites?: string;
  tva_defaut?: number;
  sep_fourniture_pose?: boolean;
  structure_devis?: string;
  mention_legale?: string;
  conditions_paiement?: string;
  onboarding_step?: number;
  onboarding_complete?: boolean;
  /** Code pays (ex. FR) — devis & affichage. */
  pays?: string;
  use_personal_library?: boolean;
  assistant_name?: string;
  feature_flag_pdp?: boolean;
  feature_flag_ereporting?: boolean;
  feature_flag_chorus?: boolean;
  feature_flag_esign_advanced?: boolean;
};

export type BackendMeResponse = BackendUser & {
  profile?: BackendProfile;
};

export type BackendDevis = {
  id: string;
  numero?: string;
  statut?: string;
  client_id?: string;
  client_nom?: string;
  total_ht?: number;
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
  siren?: string;
  tva_intracom?: string;
  categorie_fiscale?: string;
  secteur_public?: boolean;
  chorus_service_code?: string;
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
  /** Jeton pour la page publique `/f/[token]` (créé à la volée si absent). */
  public_token?: string;
  conformite_branche?: string;
  conformite_warnings?: string[];
  operations_type?: string;
  facture_type?: string;
  adresse_livraison_chantier?: string;
  chorus_service_code?: string;
  immutable?: boolean;
  locked_at?: string;
};

export type BackendTransmission = {
  id?: string;
  facture_id?: string;
  kind?: string;
  status?: string;
  detail?: string;
  provider_ref?: string | null;
  created_at?: string;
  updated_at?: string;
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
  /** Notes d’équipe, non visibles sur le PDF / client — historique concaténé côté API. */
  internal_notes?: string;
  date_expiration?: string;
  remise_type?: string;
  remise_valeur?: number;
  total_ht?: number;
  total_tva?: number;
  adresse_chantier?: string;
  esign_provider?: string;
  esign_envelope_id?: string;
  esign_status?: string;
  esign_signed_at?: string;
  esign_proof?: Record<string, unknown>;
};

