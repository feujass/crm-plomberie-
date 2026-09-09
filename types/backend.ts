import type { NotificationPreferences } from "@/lib/notifications/preferences";

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
  /** Source de vérité TVA (les deux booléens ci-dessus sont générés en base). */
  regime_tva?: "encaissements" | "debits" | "franchise_293b";
  /** Périodicité de déclaration e-reporting PA (mensuel / trimestriel / simplifié). */
  tva_periodicite_declaration?: "monthly" | "quarterly" | "simplified" | null;
  adresse_ligne1?: string;
  adresse_ligne2?: string;
  adresse_cp?: string;
  adresse_ville?: string;
  adresse_pays?: string;
  adresse_structure_proposition?: Record<string, unknown> | null;
  adresse_structure_confirmee_at?: string | null;
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
  relance_devis_jours?: number;
  relance_facture_jours?: number;
  relance_devis_echeances?: string;
  relance_facture_echeances?: string;
  notification_email?: boolean;
  notification_push?: boolean;
  notification_preferences?: NotificationPreferences;
  metier?: string;
  stripe_customer_id?: string | null;
  subscription_plan?: "free" | "pro" | "pro_plus" | "pme";
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  ia_devis_month?: string;
  ia_devis_count?: number;
  profile_voice_prompt_skipped_at?: string | null;
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
  public_token?: string;
  date_envoi?: string;
  derniere_relance_at?: string;
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

export type ClientTypeEinvoicing = "particulier" | "entreprise" | "public";

export type BackendClient = {
  id: string;
  nom: string;
  prenom?: string;
  email?: string;
  tel?: string;
  adresse?: string;
  type?: "particulier" | "professionnel" | string;
  /** GENERATED en base : particulier | entreprise | public */
  type_client?: ClientTypeEinvoicing;
  siret?: string;
  siren?: string;
  tva_intracom?: string;
  categorie_fiscale?: string;
  secteur_public?: boolean;
  chorus_service_code?: string;
  adresse_facturation_ligne1?: string;
  adresse_facturation_ligne2?: string;
  adresse_facturation_cp?: string;
  adresse_facturation_ville?: string;
  adresse_facturation_pays?: string;
  adresse_livraison_ligne1?: string;
  adresse_livraison_ligne2?: string;
  adresse_livraison_cp?: string;
  adresse_livraison_ville?: string;
  adresse_livraison_pays?: string;
  adresse_structure_proposition?: Record<string, unknown> | null;
  adresse_structure_confirmee_at?: string | null;
  notes?: string;
  inactive?: boolean;
  created_at?: string;
};

export type BackendFacture = {
  id: string;
  numero?: string;
  statut?: string;
  statut_cycle_vie?: string;
  total_ttc?: number;
  date_emission?: string;
  created_at?: string;
  client_id?: string;
  client_nom?: string;
};

export type BackendPaiement = {
  id: string;
  montant: number;
  montant_decimal?: string;
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
  nature_operation?: "biens" | "services" | "mixte" | string;
  option_tva_debits?: boolean;
  devise?: string;
  statut_cycle_vie?: "brouillon" | "emise" | "deposee" | "rejetee" | "irrecevable" | "encaissee" | string;
  snapshot_emetteur?: Record<string, unknown> | null;
  snapshot_client?: Record<string, unknown> | null;
  facturx_pdf_path?: string | null;
  facturx_xml?: string | null;
  facture_origine_numero?: string | null;
  facture_origine_date?: string | null;
  facture_origine_id?: string | null;
  montant_paye_decimal?: string;
  facture_type?: string;
  adresse_livraison_chantier?: string;
  date_prestation_debut?: string | null;
  date_prestation_fin?: string | null;
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
  ligne_type?: "prestation" | "fourniture" | "pose" | string;
  type_ligne?: "bien" | "service" | string;
  source?: string | null;
  origine_prix?: "dicte" | "prereglage" | "vide" | null;
  catalogue_ouvrage_id?: string | null;
  tva_alerte?: string | null;
  /** Décimales brutes (Postgres numeric) — utilisées pour Factur-X, sans Number(). */
  quantite_decimal?: string;
  prix_ht_decimal?: string;
  tva_decimal?: string;
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
  ia_questions?: string[];
  transcription_brute?: string;
  transcription_corrigee?: string;
  public_token?: string;
  date_envoi?: string;
  derniere_relance_at?: string;
  esign_provider?: string;
  esign_envelope_id?: string;
  esign_status?: string;
  esign_signed_at?: string;
  esign_proof?: Record<string, unknown>;
};

