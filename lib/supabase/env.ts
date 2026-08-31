/** URL publique Supabase (NEXT_PUBLIC_* ou legacy SUPABASE_URL côté Vercel). */
export function supabasePublicUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    undefined
  );
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
}

/** Auth + données via Supabase (sans BACKEND_URL / FastAPI). */
export function isSupabaseDataMode(): boolean {
  return Boolean(supabasePublicUrl() && supabaseAnonKey() && !process.env.BACKEND_URL?.trim());
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabasePublicUrl() && supabaseAnonKey());
}

/** URL publique du site (liens e-mail, redirects auth). */
export function publicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
