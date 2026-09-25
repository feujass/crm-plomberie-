/**
 * Numéro du compte WhatsApp Business rattaché au bot (Cloud API / wa.me).
 * Chiffres uniquement, sans « + », ex. 33612345678 — pas le portable personnel de l’utilisateur.
 */
export function getWhatsAppBusinessDigits(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER?.trim();
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}
