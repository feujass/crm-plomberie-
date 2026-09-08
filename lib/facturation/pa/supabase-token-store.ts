import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptAndMaybeRotate, encryptTokenSet } from "@/lib/facturation/pa/tokens";
import type { ConnectionSnapshot, OAuthTokenSet, ProviderId } from "@/lib/facturation/pa/types";
import { memoryDisconnected, type StoredConnection } from "@/lib/facturation/pa/memory-token-store";

type Db = SupabaseClient;

export async function saveConnectionAndTokens(
  supabase: Db,
  userId: string,
  provider: ProviderId,
  snapshot: ConnectionSnapshot,
  tokens: OAuthTokenSet,
): Promise<void> {
  const blob = encryptTokenSet(tokens);
  const now = new Date().toISOString();
  const conn = await supabase.from("einvoicing_connections").upsert(
    {
      user_id: userId,
      provider,
      status: snapshot.status,
      provider_company_id: snapshot.providerCompanyId,
      company_verification_status: snapshot.companyVerificationStatus,
      last_error: snapshot.lastError,
      connected_at: snapshot.connectedAt ?? now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (conn.error) throw new Error(conn.error.message);

  const tok = await supabase.from("einvoicing_oauth_tokens").upsert(
    {
      user_id: userId,
      provider,
      ciphertext: blob.ciphertext,
      iv: blob.iv,
      auth_tag: blob.authTag,
      key_id: blob.keyId,
      expires_at: tokens.expiresAt,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (tok.error) throw new Error(tok.error.message);
}

export async function loadConnection(supabase: Db, userId: string, provider: ProviderId): Promise<StoredConnection> {
  const { data, error } = await supabase
    .from("einvoicing_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return memoryDisconnected(userId, provider);
  return {
    userId,
    provider,
    lastInvoiceEventId: data.last_invoice_event_id ? String(data.last_invoice_event_id) : null,
    snapshot: {
      status: data.status,
      provider,
      providerCompanyId: data.provider_company_id ?? null,
      companyVerificationStatus: data.company_verification_status ?? null,
      lastError: data.last_error ?? null,
      connectedAt: data.connected_at ?? null,
      updatedAt: data.updated_at ?? null,
    },
  };
}

export async function loadTokens(supabase: Db, userId: string, provider: ProviderId): Promise<OAuthTokenSet | null> {
  const { data, error } = await supabase
    .from("einvoicing_oauth_tokens")
    .select("ciphertext, iv, auth_tag, key_id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { tokens, rotated } = decryptAndMaybeRotate({
    ciphertext: String(data.ciphertext),
    iv: String(data.iv),
    authTag: String(data.auth_tag),
    keyId: data.key_id ? String(data.key_id) : "v1",
  });
  if (rotated) {
    await saveTokens(supabase, userId, provider, tokens);
  }
  return tokens;
}

export async function saveTokens(supabase: Db, userId: string, provider: ProviderId, tokens: OAuthTokenSet): Promise<void> {
  const blob = encryptTokenSet(tokens);
  const { error } = await supabase.from("einvoicing_oauth_tokens").upsert(
    {
      user_id: userId,
      provider,
      ciphertext: blob.ciphertext,
      iv: blob.iv,
      auth_tag: blob.authTag,
      key_id: blob.keyId,
      expires_at: tokens.expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function setLastInvoiceEventId(
  supabase: Db,
  userId: string,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("einvoicing_connections")
    .update({ last_invoice_event_id: eventId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
