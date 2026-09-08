import type { ConnectionSnapshot, ConnectionStatus, OAuthTokenSet, ProviderId } from "@/lib/facturation/pa/types";
import { decryptAndMaybeRotate, encryptTokenSet } from "@/lib/facturation/pa/tokens";

export interface StoredConnection {
  userId: string;
  provider: ProviderId;
  snapshot: ConnectionSnapshot;
  lastInvoiceEventId: string | null;
}

type MemoryRow = StoredConnection & { blob: ReturnType<typeof encryptTokenSet> };

const memory = new Map<string, MemoryRow>();

function key(userId: string, provider: ProviderId): string {
  return `${provider}:${userId}`;
}

export function memorySaveConnection(
  userId: string,
  provider: ProviderId,
  snapshot: ConnectionSnapshot,
  tokens: OAuthTokenSet,
): void {
  memory.set(key(userId, provider), {
    userId,
    provider,
    snapshot,
    lastInvoiceEventId: memory.get(key(userId, provider))?.lastInvoiceEventId ?? null,
    blob: encryptTokenSet(tokens),
  });
}

export function memoryLoadConnection(userId: string, provider: ProviderId): StoredConnection | null {
  const row = memory.get(key(userId, provider));
  if (!row) return null;
  return {
    userId: row.userId,
    provider: row.provider,
    snapshot: row.snapshot,
    lastInvoiceEventId: row.lastInvoiceEventId,
  };
}

export function memoryLoadTokens(userId: string, provider: ProviderId): OAuthTokenSet | null {
  const row = memory.get(key(userId, provider));
  if (!row) return null;
  const { tokens, blob, rotated } = decryptAndMaybeRotate(row.blob);
  if (rotated) row.blob = blob;
  return tokens;
}

export function memoryClearConnections(): void {
  memory.clear();
}

export function memorySetLastEventId(userId: string, provider: ProviderId, eventId: string): void {
  const row = memory.get(key(userId, provider));
  if (row) row.lastInvoiceEventId = eventId;
}

export function memoryDisconnected(userId: string, provider: ProviderId = "mock"): StoredConnection {
  return {
    userId,
    provider,
    lastInvoiceEventId: null,
    snapshot: {
      status: "disconnected" as ConnectionStatus,
      provider,
      providerCompanyId: null,
      companyVerificationStatus: null,
      lastError: null,
      connectedAt: null,
      updatedAt: null,
    },
  };
}
