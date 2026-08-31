import type { BackendMeResponse, BackendProfile } from "@/types/backend";
import { resolveAssistantName } from "@/lib/assistant-branding";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";
import { relanceEcheancesFromProfile } from "@/lib/relances/save-settings";
import { trialEndsAtFromRegistration } from "@/lib/plans/trial";

type SupabaseProfileRow = Record<string, unknown>;

export function mapSupabaseProfile(row: SupabaseProfileRow | null | undefined): BackendProfile | undefined {
  if (!row) return undefined;
  const relanceFields = relanceEcheancesFromProfile({
    relance_devis_echeances: row.relance_devis_echeances as string | undefined,
    relance_facture_echeances: row.relance_facture_echeances as string | undefined,
    relance_devis_jours: row.relance_devis_jours as number | undefined,
    relance_facture_jours: row.relance_facture_jours as number | undefined,
    notification_preferences: row.notification_preferences,
  });
  const steps = Number(row.onboarding_steps_completed ?? 0);
  return {
    entreprise: (row.entreprise_nom as string) ?? "",
    siret: (row.siret as string) ?? "",
    siren: (row.siren as string) ?? "",
    forme_juridique: (row.forme_juridique as string) ?? "",
    capital_social: (row.capital_social as string) ?? "",
    rcs_ville: (row.rcs_ville as string) ?? "",
    numero_tva_intracom: (row.numero_tva_intracom as string) ?? "",
    tva_sur_encaissements: row.tva_sur_encaissements as boolean | undefined,
    tva_sur_debits_opt_in: row.tva_sur_debits_opt_in as boolean | undefined,
    decennale_mention: (row.decennale_mention as string) ?? "",
    iban: (row.iban as string) ?? "",
    bic: (row.bic as string) ?? "",
    adresse: (row.adresse as string) ?? "",
    tel: (row.tel as string) ?? "",
    email_facturation: (row.email_facturation as string) ?? "",
    logo_url: (row.logo_url as string) ?? "",
    avatar_url: (row.avatar_url as string) ?? "",
    tva_defaut: row.tva_defaut != null ? Number(row.tva_defaut) : undefined,
    sep_fourniture_pose: row.sep_fourniture_pose as boolean | undefined,
    structure_devis: (row.structure_devis as string) ?? undefined,
    mention_legale: (row.mention_legale as string) ?? "",
    conditions_paiement: (row.conditions_paiement_defaut as string) ?? "",
    onboarding_step: steps,
    onboarding_complete: steps >= 3,
    pays: (row.pays as string) ?? "FR",
    use_personal_library: row.use_personal_library as boolean | undefined,
    assistant_name: resolveAssistantName(row.assistant_name as string | undefined),
    feature_flag_pdp: row.feature_flag_pdp as boolean | undefined,
    feature_flag_ereporting: row.feature_flag_ereporting as boolean | undefined,
    feature_flag_chorus: row.feature_flag_chorus as boolean | undefined,
    feature_flag_esign_advanced: row.feature_flag_esign_advanced as boolean | undefined,
    relance_devis_jours: row.relance_devis_jours != null ? Number(row.relance_devis_jours) : undefined,
    relance_facture_jours: row.relance_facture_jours != null ? Number(row.relance_facture_jours) : undefined,
    relance_devis_echeances: relanceFields.relance_devis_echeances,
    relance_facture_echeances: relanceFields.relance_facture_echeances,
    notification_email: row.notification_email as boolean | undefined,
    notification_push: row.notification_push as boolean | undefined,
    notification_preferences: parseNotificationPreferences(row.notification_preferences, {
      notification_email: row.notification_email as boolean | undefined,
      notification_push: row.notification_push as boolean | undefined,
    }),
    stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
    subscription_plan: (row.subscription_plan as BackendProfile["subscription_plan"]) ?? "free",
    subscription_status: (row.subscription_status as string | null) ?? null,
    trial_ends_at: (row.trial_ends_at as string | null) ?? null,
    ia_devis_month: (row.ia_devis_month as string) ?? undefined,
    ia_devis_count: row.ia_devis_count != null ? Number(row.ia_devis_count) : undefined,
    profile_voice_prompt_skipped_at: (row.profile_voice_prompt_skipped_at as string | null) ?? null,
  };
}

export function mapMinimalRegisterToSupabaseProfile(email: string): Record<string, unknown> {
  return {
    email_facturation: email,
    onboarding_steps_completed: 0,
    assistant_name: "Zeus",
    mention_legale: "Devis valable 30 jours. TVA non applicable, art. 293 B du CGI (le cas échéant).",
    conditions_paiement_defaut: "Paiement à 30 jours",
    trial_ends_at: trialEndsAtFromRegistration(),
  };
}

export function mapRegisterToSupabaseProfile(input: {
  prenom: string;
  nom: string;
  tel: string;
  entreprise: string;
  siret: string;
  adresse: string;
  siren?: string;
  forme_juridique?: string;
  capital_social?: string;
  rcs_ville?: string;
  numero_tva_intracom?: string;
  email_facturation?: string;
}): { core: Record<string, unknown>; extended: Record<string, unknown> } {
  const core: Record<string, unknown> = {
    prenom: input.prenom,
    nom: input.nom,
    tel: input.tel,
    entreprise_nom: input.entreprise,
    siret: input.siret.replace(/\s/g, ""),
    adresse: input.adresse,
    email_facturation: input.email_facturation ?? "",
    onboarding_steps_completed: 3,
    assistant_name: "Zeus",
    mention_legale: "Devis valable 30 jours. TVA non applicable, art. 293 B du CGI (le cas échéant).",
    conditions_paiement_defaut: "Paiement à 30 jours",
    trial_ends_at: trialEndsAtFromRegistration(),
  };

  const extended: Record<string, unknown> = {};
  const siren = input.siren?.replace(/\s/g, "") ?? "";
  if (siren) extended.siren = siren;
  if (input.forme_juridique?.trim()) extended.forme_juridique = input.forme_juridique.trim();
  if (input.capital_social?.trim()) extended.capital_social = input.capital_social.trim();
  if (input.rcs_ville?.trim()) extended.rcs_ville = input.rcs_ville.trim();
  if (input.numero_tva_intracom?.trim()) extended.numero_tva_intracom = input.numero_tva_intracom.trim();

  return { core, extended };
}

export function buildMeResponse(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  profileRow: SupabaseProfileRow | null,
): BackendMeResponse {
  const profile = mapSupabaseProfile(profileRow);
  return {
    id: user.id,
    email: user.email ?? "",
    prenom: (profileRow?.prenom as string | undefined) ?? (user.user_metadata?.prenom as string | undefined) ?? "",
    nom: (profileRow?.nom as string | undefined) ?? (user.user_metadata?.nom as string | undefined) ?? "",
    role: "user",
    profile,
  };
}
