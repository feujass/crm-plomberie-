"use client";

import { cleanRecoveryUrl, establishRecoverySession } from "@/lib/supabase/recovery-client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Sur /login ou /, intercepte les tokens Supabase (hash ou ?code=) d’un e-mail
 * de réinitialisation et redirige vers /reset-password avec session établie.
 */
export function SupabaseRecoveryBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (pathname !== "/login" && pathname !== "/") return;

    const hash = window.location.hash;
    const search = window.location.search;
    const looksLikeRecovery =
      hash.includes("type=recovery") ||
      hash.includes("access_token=") ||
      (search.includes("code=") && !search.includes("redirect=")) ||
      (search.includes("token_hash=") && search.includes("type=recovery"));

    if (!looksLikeRecovery) return;

    handled.current = true;

    (async () => {
      const result = await establishRecoverySession(search, hash);
      if (result.ok) {
        cleanRecoveryUrl("/reset-password");
        router.replace("/reset-password");
        return;
      }
      if (result.error) {
        router.replace(`/reset-password?error=${encodeURIComponent(result.error)}`);
      }
    })();
  }, [pathname, router]);

  return null;
}
