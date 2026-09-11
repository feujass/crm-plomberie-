import type { BackendProfile } from "@/types/backend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Retourne une adresse Reply-To valide pour Resend, ou undefined. */
export function sanitizeReplyToEmail(raw?: string | null): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  if (EMAIL_RE.test(value)) return value;

  const angle = value.match(/<([^>]+)>/);
  const fromAngle = angle?.[1]?.trim();
  if (fromAngle && EMAIL_RE.test(fromAngle)) return fromAngle;

  return undefined;
}

/** Extrait l’adresse e-mail d’une ligne `Nom <email@domaine.fr>`. */
function parseFromEmail(from: string): string | null {
  const m = from.match(/<([^>]+)>/);
  return m?.[1]?.trim() || null;
}

/**
 * Adresse d’envoi Resend pour e-mails **client** (devis, factures).
 * - L’adresse technique (`from`) doit être vérifiée dans Resend (domaine ou onboarding@resend.dev en test).
 * - Le **nom affiché** côté client = nom de l’entreprise de l’artisan (pas « Flowo »).
 */
export function buildClientEmailFrom(profile: BackendProfile | undefined): string {
  const configured = process.env.RESEND_FROM?.trim() || "Flowo <onboarding@resend.dev>";
  const company = profile?.entreprise?.trim();
  const email =
    parseFromEmail(configured) ||
    profile?.email_facturation?.trim() ||
    "onboarding@resend.dev";

  if (!company) return configured;

  const safeName = company.replace(/"/g, "'");
  return `"${safeName}" <${email}>`;
}

/** Adresse d’envoi pour e-mails **plateforme** (auth, notifs artisan, affiliation). */
export function buildPlatformEmailFrom(): string {
  return process.env.RESEND_FROM?.trim() || "Flowo <onboarding@resend.dev>";
}
