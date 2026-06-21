import type { EtapeMetier, ChantierStatus } from "@/lib/chantier";

export type Chantier = {
  id: string;
  name: string;
  client_id?: string | null;
  devis_id?: string | null;
  status?: ChantierStatus | string;
  due_date?: string | null; // YYYY-MM-DD
  responsible?: string | null;
  comment?: string | null;
  site_address?: string | null;
  chantier_type?: string | null;
  budget_estime?: number | null;
  heures_prevues?: number | null;
  heures_passees?: number | null;
  etape_metier?: EtapeMetier | string | null;
  photo_urls?: string[] | null;
  a_relancer?: boolean | null;
  /** Prochaine étape métier (relance, passage, facture d’acompte…) — affichée sur listes et accueil. */
  next_action_label?: string | null;
  /** Date cible YYYY-MM-DD pour la prochaine étape. */
  next_action_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

