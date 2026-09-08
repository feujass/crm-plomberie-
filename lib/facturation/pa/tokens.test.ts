import { afterEach, describe, expect, it } from "vitest";

import { redactSecrets } from "@/lib/facturation/pa/redact";
import { decryptAndMaybeRotate, decryptTokenSet, encryptTokenSet } from "@/lib/facturation/pa/tokens";
import {
  memoryClearConnections,
  memoryLoadTokens,
  memorySaveConnection,
} from "@/lib/facturation/pa/memory-token-store";
import { snapshotForScenario, tokensForScenario } from "@/lib/facturation/pa/mock-fixtures";

const KEY_V1 = Buffer.alloc(32, 7).toString("base64");
const KEY_V2 = Buffer.alloc(32, 9).toString("base64");

function clearKeyEnv() {
  delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEY;
  delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID;
  delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEYS;
}

describe("jetons OAuth chiffrés", () => {
  afterEach(() => {
    clearKeyEnv();
    memoryClearConnections();
  });

  it("chiffre et déchiffre un jeu de jetons avec l’identifiant de clé courant", () => {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V1;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v1";
    const tokens = tokensForScenario("verified");
    const blob = encryptTokenSet(tokens);
    expect(blob.keyId).toBe("v1");
    expect(blob.ciphertext).not.toContain(tokens.accessToken);
    expect(decryptTokenSet(blob)).toEqual(tokens);
  });

  it("déchiffre encore après rotation si l’ancienne clé reste dans le trousseau", () => {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V1;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v1";
    const tokens = tokensForScenario("verified");
    const oldBlob = encryptTokenSet(tokens);

    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V2;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v2";
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEYS = JSON.stringify({ v1: KEY_V1 });

    expect(decryptTokenSet(oldBlob)).toEqual(tokens);
    const rotated = decryptAndMaybeRotate(oldBlob);
    expect(rotated.rotated).toBe(true);
    expect(rotated.blob.keyId).toBe("v2");
    expect(rotated.tokens).toEqual(tokens);

    delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEYS;
    expect(decryptTokenSet(rotated.blob)).toEqual(tokens);
  });

  it("refuse de déchiffrer si la clé change sans version ni trousseau", () => {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V1;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v1";
    const blob = encryptTokenSet(tokensForScenario("verified"));

    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V2;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v2";
    expect(() => decryptTokenSet(blob)).toThrow(/inconnue: v1/);
  });

  it("re-chiffre au chargement mémoire après rotation", () => {
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V1;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v1";
    const tokens = tokensForScenario("verified");
    memorySaveConnection("u1", "mock", snapshotForScenario("verified"), tokens);

    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V2;
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID = "v2";
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEYS = JSON.stringify({ v1: KEY_V1 });
    expect(memoryLoadTokens("u1", "mock")).toEqual(tokens);

    delete process.env.EINVOICING_TOKEN_ENCRYPTION_KEYS;
    expect(memoryLoadTokens("u1", "mock")).toEqual(tokens);
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
    process.env.EINVOICING_TOKEN_ENCRYPTION_KEY = KEY_V1;
    const tokens = tokensForScenario("verified");
    memorySaveConnection("u1", "mock", snapshotForScenario("verified"), tokens);
    expect(memoryLoadTokens("u1", "mock")).toEqual(tokens);
  });
});
