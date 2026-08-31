import { createAdminClient } from "@/lib/supabase/admin";
import {
  STORAGE_REF_PREFIX,
  extractLogosStoragePath,
  toStorageRef,
} from "@/lib/security/logo-url";

const SIGNED_TTL_SEC = 60 * 60 * 24 * 7;

export async function createSignedLogoUrl(path: string, expiresIn = SIGNED_TTL_SEC): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("logos").createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Résout sb://, URL publique legacy ou URL HTTPS externe pour affichage / PDF. */
export async function resolveLogoUrl(logoUrl: string | null | undefined): Promise<string | null> {
  const raw = String(logoUrl ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("data:image/")) return raw;
  if (raw.startsWith(STORAGE_REF_PREFIX) || raw.includes("/storage/v1/object/")) {
    const path = extractLogosStoragePath(raw);
    if (!path) return null;
    return createSignedLogoUrl(path);
  }
  if (/^https:\/\//i.test(raw)) return raw;
  return null;
}

export async function resolveProfileLogoUrl(profileLogo: string | null | undefined): Promise<string | null> {
  return resolveLogoUrl(profileLogo);
}

export { toStorageRef };
