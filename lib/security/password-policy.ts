export const PASSWORD_MIN_LENGTH = 8;

/** Inscription / reset : longueur minimale uniquement (pas de contrainte lettre+chiffre). */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Ton mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  return null;
}

export function isPasswordValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}
