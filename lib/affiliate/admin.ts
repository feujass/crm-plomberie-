import { CONTACT_EMAIL } from "@/lib/app-branding";

/** E-mails autorisés à gérer les candidatures affiliation (séparés par virgule ou espace). */
export function getAffiliateAdminEmails(): string[] {
  const raw = process.env.FLOWO_ADMIN_EMAILS?.trim() || CONTACT_EMAIL;
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAffiliateAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAffiliateAdminEmails().includes(normalized);
}
