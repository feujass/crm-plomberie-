import { createClient } from "@/lib/supabase/client";
import { extractLogosStoragePath } from "@/lib/security/logo-url";

/** URL affichable (signée si stockage privé Supabase). */
export async function resolveClientLogoDisplayUrl(value: string): Promise<string> {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("data:image/")) return v;
  if (/^https:\/\//i.test(v) && !v.includes("/storage/v1/object/")) return v;
  const path = extractLogosStoragePath(v);
  if (!path) return v;
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("logos").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return v;
  return data.signedUrl;
}
