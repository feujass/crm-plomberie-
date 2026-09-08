import { EinvoicingError, SuperPdpApiError } from "@/lib/facturation/pa/errors";
import type { EInvoicingProvider } from "@/lib/facturation/pa/provider";
import { postgresAndProcessTokenLock, type ExclusiveLock } from "@/lib/facturation/pa/token-refresh-lock";
import { oauthTokenSetsDiffer } from "@/lib/facturation/pa/tokens";
import type { OAuthTokenSet } from "@/lib/facturation/pa/types";
import { loadTokens, saveTokens } from "@/lib/facturation/pa/supabase-token-store";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredTokenGate = {
  load: () => Promise<OAuthTokenSet | null>;
  save: (tokens: OAuthTokenSet) => Promise<void>;
  lock: ExclusiveLock;
};

function isInvalidGrant(err: unknown): boolean {
  if (!(err instanceof SuperPdpApiError) || err.httpStatus !== 400) return false;
  const body = err.responseBody;
  const desc =
    body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error) : err.message;
  return desc.includes("invalid_grant") || err.message.includes("invalid_grant");
}

/**
 * Charge / rafraîchit / persiste les jetons sous verrou.
 * Deux appels concurrents : un seul refresh Super PDP ; le second relit le blob déjà rotaté.
 */
export async function withFreshStoredTokens<T>(
  provider: EInvoicingProvider,
  userId: string,
  gate: StoredTokenGate,
  run: (tokens: OAuthTokenSet) => Promise<T>,
): Promise<{ result: T; tokens: OAuthTokenSet }> {
  return gate.lock.runExclusive(async () => {
    const loaded = await gate.load();
    if (!loaded) {
      throw new EinvoicingError("not_connected", "Entreprise non raccordée à la plateforme de facturation.", 409);
    }
    try {
      const { result, tokens } = await withFreshTokens(provider, { userId }, loaded, run);
      if (oauthTokenSetsDiffer(loaded, tokens)) await gate.save(tokens);
      return { result, tokens };
    } catch (err) {
      if (!isInvalidGrant(err)) throw err;
      const retried = await gate.load();
      if (!retried || !oauthTokenSetsDiffer(loaded, retried)) throw err;
      const { result, tokens } = await withFreshTokens(provider, { userId }, retried, run);
      if (oauthTokenSetsDiffer(retried, tokens)) await gate.save(tokens);
      return { result, tokens };
    }
  });
}

export function supabaseStoredTokenGate(
  supabase: SupabaseClient,
  userId: string,
  providerId: EInvoicingProvider["id"],
): StoredTokenGate {
  return {
    load: () => loadTokens(supabase, userId, providerId),
    save: (tokens) => saveTokens(supabase, userId, providerId, tokens),
    lock: postgresAndProcessTokenLock(
      {
        rpc: (fn, args) => supabase.rpc(fn as "einvoicing_lock_oauth_tokens", args),
      },
      userId,
    ),
  };
}
