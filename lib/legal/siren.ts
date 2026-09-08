/** Validation SIREN (9 chiffres + Luhn) et SIRET (14 chiffres + Luhn). */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Luhn (base 10) — algorithme INSEE pour SIREN / SIRET. */
export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length === 0) return false;
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    let n = Number(digits[len - 1 - i]);
    if (!Number.isFinite(n)) return false;
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function isValidSiren(value: string | null | undefined): boolean {
  const d = digitsOnly(String(value ?? ""));
  return d.length === 9 && luhnValid(d);
}

/**
 * Sandbox Super PDP : les numéros d’entreprise (`000000001`, `000000002`) ne
 * passent pas Luhn. On les accepte uniquement si `SUPERPDP_COMPANY_NUMBER_SCHEME=sandbox`.
 */
export function isSandboxCompanyNumber(value: string | null | undefined): boolean {
  const scheme = String(process.env.SUPERPDP_COMPANY_NUMBER_SCHEME ?? "")
    .trim()
    .toLowerCase();
  if (scheme !== "sandbox") return false;
  const d = digitsOnly(String(value ?? ""));
  return d.length === 9;
}

export function isAllowedSiren(value: string | null | undefined): boolean {
  return isValidSiren(value) || isSandboxCompanyNumber(value);
}

export function isValidSiret(value: string | null | undefined): boolean {
  const d = digitsOnly(String(value ?? ""));
  return d.length === 14 && luhnValid(d);
}

/** SIREN dérivé d'un SIRET (9 premiers chiffres), revalidé Luhn. */
export function sirenFromSiret(siret: string): string | null {
  const d = digitsOnly(siret);
  if (d.length !== 14) return null;
  const siren = d.slice(0, 9);
  return isValidSiren(siren) ? siren : null;
}

export function assertSirenOrSiretForPro(input: {
  typeClient: "particulier" | "entreprise" | "public";
  siren?: string | null;
  siret?: string | null;
}): { ok: true } | { ok: false; message: string } {
  if (input.typeClient === "particulier") return { ok: true };
  const siren = String(input.siren ?? "").trim();
  const siret = String(input.siret ?? "").trim();
  if (siren && !isAllowedSiren(siren)) {
    return { ok: false, message: "SIREN invalide (9 chiffres, clé Luhn)." };
  }
  if (siret && !isValidSiret(siret)) {
    return { ok: false, message: "SIRET invalide (14 chiffres, clé Luhn)." };
  }
  if (!isAllowedSiren(siren) && !isValidSiret(siret)) {
    return { ok: false, message: "SIREN ou SIRET obligatoire pour un client professionnel ou public." };
  }
  return { ok: true };
}
