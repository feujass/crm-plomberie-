import { afterEach, describe, expect, it } from "vitest";

import { redactSecrets } from "@/lib/facturation/pa/redact";
import { decryptTokenSet, encryptTokenSet } from "@/lib/facturation/pa/tokens";
import {
  memoryClearConnections,
  memoryLoadTokens,
  memorySaveConnection,
} from "@/lib/facturation/pa/memory-token-store";
import { snapshotForScenario, tokensForScenario } from "@/lib/facturation/pa/mock-fixtures";

const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

describe("jetons OAuth chiffrés", () => {
  afterEach(() => {
    delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEY;
    memoryClearConnections();
  });

  it("chiffre et déchiffre un jeu de jetons", () => {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const tokens = tokensForScenario("verified");
    const blob = encryptTokenSet(tokens);
    expect(blob.ciphertext).not.toContain(tokens.accessToken);
    expect(decryptTokenSet(blob)).toEqual(tokens);
  });

  it("ne laisse pas le jeton en clair dans un objet à logger", () => {
    const redacted = redactSecrets({
      accessToken: "secret-access",
      refresh_token: "secret-refresh",
      Authorization: "Bearer abc.def",
      status: "verified",
    }) as Record<string, string>;
    expect(redacted.accessToken).toBe("[redacted]");
    expect(redacted.refresh_token).toBe("[redacted]");
    expect(redacted.Authorization).toBe("[redacted]");
    expect(redacted.status).toBe("verified");
  });

  it("stocke uniquement le blob chiffré en mémoire", () => {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const tokens = tokensForScenario("verified");
    memorySaveConnection("u1", "mock", snapshotForScenario("verified"), tokens);
    expect(memoryLoadTokens("u1", "mock")).toEqual(tokens);
  });
});
