import { afterEach, describe, expect, it } from "vitest";

import { SuperPdpApiError } from "@/lib/facturation/pa/errors";
import { memoryClearConnections, memoryLoadTokens, memorySaveConnection } from "@/lib/facturation/pa/memory-token-store";
import { snapshotForScenario } from "@/lib/facturation/pa/mock-fixtures";
import { MockProvider } from "@/lib/facturation/pa/mock-provider";
import {
  createMemoryExclusiveLock,
  resetProcessExclusiveLocks,
  withPostgresTokenLease,
  type TokenLockRpc,
} from "@/lib/facturation/pa/token-refresh-lock";
import type { FiscalEntityRef, OAuthTokenSet } from "@/lib/facturation/pa/types";
import { withFreshStoredTokens, type StoredTokenGate } from "@/lib/facturation/pa/with-fresh-stored-tokens";
import { withFreshTokens } from "@/lib/facturation/pa/with-fresh-tokens";

const KEY = Buffer.alloc(32, 3).toString("base64");
const USER = "11111111-1111-4111-8111-111111111111";

function expiredTokens(refreshToken = "r0"): OAuthTokenSet {
  return {
    accessToken: "a0",
    refreshToken,
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() - 120_000).toISOString(),
  };
}

class RotatingProvider extends MockProvider {
  refreshes = 0;
  inFlight: string | null = null;
  readonly used = new Set<string>();
  delayMs = 60;

  override async refreshAccessToken(_entity: FiscalEntityRef, tokens: OAuthTokenSet): Promise<OAuthTokenSet> {
    const current = tokens.refreshToken ?? "";
    if (this.used.has(current) || this.inFlight === current) {
      throw new SuperPdpApiError({
        method: "POST",
        path: "/oauth2/token",
        status: 400,
        message: "invalid_grant",
        responseBody: { error: "invalid_grant", error_description: "The refresh token is malformed or not valid." },
      });
    }
    this.inFlight = current;
    await new Promise((r) => setTimeout(r, this.delayMs));
    this.used.add(current);
    this.inFlight = null;
    this.refreshes += 1;
    return {
      accessToken: `a${this.refreshes}`,
      refreshToken: `r${this.refreshes}`,
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
  }
}

function memoryGate(userId: string, lock = createMemoryExclusiveLock()): StoredTokenGate {
  return {
    load: async () => memoryLoadTokens(userId, "mock"),
    save: async (tokens) => {
      memorySaveConnection(userId, "mock", snapshotForScenario("verified"), tokens);
    },
    lock,
  };
}

describe("refresh rotatif concurrent", () => {
  afterEach(() => {
    delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEY;
    delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID;
    memoryClearConnections();
    resetProcessExclusiveLocks();
  });

  function setupStore(userId = USER) {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v1";
    memorySaveConnection(userId, "mock", snapshotForScenario("verified"), expiredTokens());
  }

  it("sans verrou : le second refresh casse en invalid_grant", async () => {
    const provider = new RotatingProvider();
    const stale = expiredTokens();
    const ping = (_p: RotatingProvider, t: OAuthTokenSet) => _p.getConnectionStatus({ userId: USER }, t);

    const results = await Promise.allSettled([
      withFreshTokens(provider, { userId: USER }, stale, (t) => ping(provider, t)),
      withFreshTokens(provider, { userId: USER }, stale, (t) => ping(provider, t)),
    ]);

    expect(provider.refreshes).toBeGreaterThanOrEqual(1);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    const grant = rejected.find(
      (r) => r.status === "rejected" && r.reason instanceof SuperPdpApiError && r.reason.message.includes("invalid_grant"),
    );
    expect(grant).toBeDefined();
  });

  it("avec verrou : un seul refresh, les deux appels réussissent", async () => {
    setupStore();
    const provider = new RotatingProvider();
    const gate = memoryGate(USER);
    const ping = (t: OAuthTokenSet) => provider.getConnectionStatus({ userId: USER }, t);

    const [a, b] = await Promise.all([
      withFreshStoredTokens(provider, USER, gate, ping),
      withFreshStoredTokens(provider, USER, gate, ping),
    ]);

    expect(provider.refreshes).toBe(1);
    expect(a.tokens.refreshToken).toBe("r1");
    expect(b.tokens.refreshToken).toBe("r1");
    expect(memoryLoadTokens(USER, "mock")?.refreshToken).toBe("r1");
  });

  it("lease Postgres : le second attend puis relit les jetons rotatés", async () => {
    setupStore();
    const provider = new RotatingProvider();
    let held = false;
    const db: TokenLockRpc = {
      async rpc(fn) {
        if (fn === "einvoicing_lock_oauth_tokens") {
          if (held) return { data: false, error: null };
          held = true;
          return { data: true, error: null };
        }
        held = false;
        return { data: true, error: null };
      },
    };
    const gate: StoredTokenGate = {
      ...memoryGate(USER),
      lock: {
        runExclusive: (fn) => withPostgresTokenLease(db, USER, fn),
      },
    };

    const ping = (t: OAuthTokenSet) => provider.getConnectionStatus({ userId: USER }, t);
    const [a, b] = await Promise.all([
      withFreshStoredTokens(provider, USER, gate, ping),
      withFreshStoredTokens(provider, USER, gate, ping),
    ]);

    expect(provider.refreshes).toBe(1);
    expect(a.tokens.accessToken).toBe("a1");
    expect(b.tokens.accessToken).toBe("a1");
  });
});
