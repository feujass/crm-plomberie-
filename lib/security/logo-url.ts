const HTTPS_URL = /^https:\/\//i;
const DATA_IMAGE = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;
export const STORAGE_REF_PREFIX = "sb://logos/";

export function isAllowedLogoUrl(value: string | null | undefined): boolean {
  const v = String(value ?? "").trim();
  if (!v) return true;
  if (v.startsWith(STORAGE_REF_PREFIX)) {
    const path = v.slice(STORAGE_REF_PREFIX.length);
    return /^[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/.test(path);
  }
  if (DATA_IMAGE.test(v)) return v.length <= 600_000;
  if (!HTTPS_URL.test(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function logoUrlValidationError(value: string | null | undefined): string | null {
  if (isAllowedLogoUrl(value)) return null;
  return "URL de logo invalide (HTTPS, référence stockage ou image intégrée uniquement).";
}

/** Extrait le chemin storage depuis une URL publique Supabase legacy ou une ref sb:// */
export function extractLogosStoragePath(value: string): string | null {
  const v = value.trim();
  if (v.startsWith(STORAGE_REF_PREFIX)) {
    return v.slice(STORAGE_REF_PREFIX.length);
  }
  const marker = "/storage/v1/object/public/logos/";
  const idx = v.indexOf(marker);
  if (idx >= 0) {
    return decodeURIComponent(v.slice(idx + marker.length).split("?")[0] ?? "");
  }
  const signedMarker = "/storage/v1/object/sign/logos/";
  const sidx = v.indexOf(signedMarker);
  if (sidx >= 0) {
    return decodeURIComponent(v.slice(sidx + signedMarker.length).split("?")[0] ?? "");
  }
  return null;
}

export function toStorageRef(path: string): string {
  return `${STORAGE_REF_PREFIX}${path.replace(/^\/+/, "")}`;
}
