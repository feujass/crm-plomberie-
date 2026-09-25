type GoogleLikeUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export function namesFromGoogleUser(user: GoogleLikeUser): { prenom: string; nom: string } {
  const meta = user.user_metadata ?? {};
  const given = String(meta.given_name ?? meta.prenom ?? "").trim();
  const family = String(meta.family_name ?? meta.nom ?? "").trim();
  if (given || family) {
    return { prenom: given, nom: family };
  }
  const full = String(meta.full_name ?? meta.name ?? "").trim();
  if (!full) return { prenom: "", nom: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { prenom: parts[0]!, nom: "" };
  return { prenom: parts[0]!, nom: parts.slice(1).join(" ") };
}
