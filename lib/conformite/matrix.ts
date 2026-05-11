/**
 * Matrice B2B / B2C / secteur public — alignée sur `backend/conformite.py`.
 * Utilisée côté UI pour affichage (libellés) ; la source de vérité reste l’API.
 */

export type ConformiteBranche =
  | "b2b_fr_tva"
  | "b2c"
  | "secteur_public"
  | "b2b_intl"
  | "b2b_fr_non_assujetti";

export function transmissionKindsForBranche(branche: ConformiteBranche): string[] {
  switch (branche) {
    case "b2b_fr_tva":
      return ["pdp_einvoicing"];
    case "b2c":
    case "b2b_fr_non_assujetti":
    case "b2b_intl":
      return ["pdp_ereporting"];
    case "secteur_public":
      return ["chorus_pro", "pdp_einvoicing"];
    default:
      return ["pdp_ereporting"];
  }
}

export function labelBranche(branche: string): string {
  const m: Record<string, string> = {
    b2b_fr_tva: "B2B France (TVA) — facture électronique PDP",
    b2c: "B2C — e-reporting",
    secteur_public: "Secteur public — Chorus Pro (+ PDP selon cas)",
    b2b_intl: "International — e-reporting",
    b2b_fr_non_assujetti: "Pro non assujetti — e-reporting",
  };
  return m[branche] ?? branche;
}

export function labelTransmissionKind(kind: string): string {
  const m: Record<string, string> = {
    pdp_einvoicing: "PDP — e-invoicing (B2B)",
    pdp_ereporting: "PDP — e-reporting",
    chorus_pro: "Chorus Pro",
  };
  return m[kind] ?? kind;
}

export function labelTransmissionStatus(status: string): string {
  const m: Record<string, string> = {
    simulated_ok: "Simulé (aucun envoi réel)",
    configuration_required: "Configuration PDP requise",
    pending_send: "En attente d’envoi",
  };
  return m[status] ?? status;
}
