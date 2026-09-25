import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseDataMode } from "@/lib/supabase/env";

export type LandingLeadSource = "login" | "register";

export type LandingLeadInput = {
  source_page: LandingLeadSource;
  email: string;
  prenom?: string | null;
  nom?: string | null;
  tel?: string | null;
  entreprise?: string | null;
  metier?: string | null;
  siret?: string | null;
  adresse?: string | null;
  siren?: string | null;
  forme_juridique?: string | null;
  capital_social?: string | null;
  rcs_ville?: string | null;
  numero_tva_intracom?: string | null;
  email_facturation?: string | null;
  success: boolean;
  error_message?: string | null;
  session_id?: string | null;
  country?: string | null;
};

function trimOrNull(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function parseSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[0-9a-f-]{36}$/i.test(trimmed) ? trimmed : null;
}

export function landingLeadFromRegisterBody(
  body: Record<string, unknown>,
  result: { success: boolean; error_message?: string | null },
): LandingLeadInput {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  return {
    source_page: "register",
    email: email || "(sans email)",
    prenom: trimOrNull(body.prenom, 120),
    nom: trimOrNull(body.nom, 120),
    tel: trimOrNull(body.tel, 40),
    entreprise: trimOrNull(body.entreprise, 200),
    metier: trimOrNull(body.metier, 80),
    siret: trimOrNull(body.siret, 20),
    adresse: trimOrNull(body.adresse, 500),
    siren: trimOrNull(body.siren, 20),
    forme_juridique: trimOrNull(body.forme_juridique, 80),
    capital_social: trimOrNull(body.capital_social, 80),
    rcs_ville: trimOrNull(body.rcs_ville, 120),
    numero_tva_intracom: trimOrNull(body.numero_tva_intracom, 40),
    email_facturation: trimOrNull(body.email_facturation, 320),
    session_id: parseSessionId(body.analytics_session_id),
    success: result.success,
    error_message: result.error_message ? result.error_message.slice(0, 500) : null,
  };
}

export function resolveRequestCountry(req: Request): string | null {
  return req.headers.get("x-vercel-ip-country")?.trim().slice(0, 2) ?? null;
}

/** Enregistrement best-effort — ne bloque jamais le flux auth. */
export function captureLandingLead(input: LandingLeadInput, country?: string | null): void {
  if (!isSupabaseDataMode()) return;

  const row = {
    session_id: input.session_id ?? null,
    source_page: input.source_page,
    email: input.email.slice(0, 320),
    prenom: input.prenom ?? null,
    nom: input.nom ?? null,
    tel: input.tel ?? null,
    entreprise: input.entreprise ?? null,
    metier: input.metier ?? null,
    siret: input.siret ?? null,
    adresse: input.adresse ?? null,
    siren: input.siren ?? null,
    forme_juridique: input.forme_juridique ?? null,
    capital_social: input.capital_social ?? null,
    rcs_ville: input.rcs_ville ?? null,
    numero_tva_intracom: input.numero_tva_intracom ?? null,
    email_facturation: input.email_facturation ?? null,
    success: input.success,
    error_message: input.error_message ?? null,
    country: country ?? input.country ?? null,
  };

  void (async () => {
    try {
      const supabase = createAdminClient();
      await supabase.from("landing_leads").insert(row);
    } catch {
      // ignore
    }
  })();
}
