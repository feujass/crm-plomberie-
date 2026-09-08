import { digitsOnly, isValidSiren, sirenFromSiret } from "@/lib/legal/siren";
import type { AuthorizationStartInput } from "@/lib/facturation/pa/types";

export type SuperPdpPrefill = Pick<AuthorizationStartInput, "companyNumber" | "companyNumberScheme">;

/**
 * Prefill OAuth Super PDP.
 * En production FR : SIREN (9 chiffres) + scheme `fr_siren`, dérivé du SIRET si besoin.
 * En sandbox : `SUPERPDP_COMPANY_NUMBER_SCHEME=sandbox` + numéro sandbox.
 */
export function superPdpCompanyPrefill(input: {
  siret?: string | null;
  siren?: string | null;
  schemeOverride?: AuthorizationStartInput["companyNumberScheme"] | string | null;
  sandboxNumber?: string | null;
}): SuperPdpPrefill {
  const override = String(input.schemeOverride ?? process.env.SUPERPDP_COMPANY_NUMBER_SCHEME ?? "")
    .trim()
    .toLowerCase();
  if (override === "sandbox") {
    const number =
      String(input.sandboxNumber ?? process.env.SUPERPDP_COMPANY_NUMBER ?? "").trim() ||
      digitsOnly(String(input.siren ?? "")) ||
      digitsOnly(String(input.siret ?? ""));
    if (!number) return {};
    return { companyNumber: number, companyNumberScheme: "sandbox" };
  }
  if (override === "be_numero_entreprise") {
    const number = digitsOnly(String(input.siren ?? input.siret ?? ""));
    if (!number) return {};
    return { companyNumber: number, companyNumberScheme: "be_numero_entreprise" };
  }

  const sirenRaw = digitsOnly(String(input.siren ?? ""));
  const siren = isValidSiren(sirenRaw) ? sirenRaw : sirenFromSiret(String(input.siret ?? ""));
  if (!siren) return {};
  return { companyNumber: siren, companyNumberScheme: "fr_siren" };
}
