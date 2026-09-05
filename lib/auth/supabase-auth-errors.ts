import { PASSWORD_MIN_LENGTH } from "@/lib/security/password-policy";

/** Traduit les erreurs Supabase Auth en français simple pour l’UI inscription/connexion. */
export function translateSupabaseAuthError(message: string): string {
  const m = message.trim();
  if (!m) return "Une erreur est survenue. Réessaie.";

  if (/password.*at least|Password should be at least/i.test(m)) {
    return `Ton mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (/weak password|password.*weak/i.test(m)) {
    return `Choisis un mot de passe d’au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (/already registered|already exists|User already registered/i.test(m)) {
    return "Cet e-mail est déjà utilisé. Connecte-toi ou réinitialise ton mot de passe.";
  }
  if (/invalid email/i.test(m)) {
    return "Adresse e-mail invalide.";
  }
  if (/invalid login credentials/i.test(m)) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (/email not confirmed/i.test(m)) {
    return "Confirme ton e-mail via le lien reçu avant de te connecter.";
  }
  if (/rate limit|too many requests/i.test(m)) {
    return "Trop de tentatives. Attends une minute et réessaie.";
  }

  return m;
}
