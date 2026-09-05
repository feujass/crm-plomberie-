import { createClient } from "@/lib/supabase/client";

export type RecoverySessionResult =
  | { ok: true; method: "hash" | "code" | "token_hash" | "session" }
  | { ok: false; error?: string };

/** Établit une session recovery depuis l’URL (hash, ?code=, ?token_hash=) ou session existante. */
export async function establishRecoverySession(search: string, hash: string): Promise<RecoverySessionResult> {
  const supabase = createClient();
  const params = new URLSearchParams(search);

  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const hashType = hashParams.get("type");

  if (accessToken && refreshToken && hashType === "recovery") {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) return { ok: false, error: error.message };
    return { ok: true, method: "hash" };
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, error: error.message };
    return { ok: true, method: "code" };
  }

  const tokenHash = params.get("token_hash");
  if (tokenHash && params.get("type") === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error) return { ok: false, error: error.message };
    return { ok: true, method: "token_hash" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return { ok: true, method: "session" };
  }

  return { ok: false };
}

export function cleanRecoveryUrl(pathname = "/reset-password") {
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", pathname);
  }
}
