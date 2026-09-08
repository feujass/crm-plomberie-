import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { OAuthTokenSet } from "@/lib/facturation/pa/types";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

export interface EncryptedTokenBlob {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function loadKey(): Buffer {
  const raw = process.env.EINVOICING_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("EINVOICING_TOKEN_ENCRYPTION_KEY manquant (32 octets en base64).");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("EINVOICING_TOKEN_ENCRYPTION_KEY doit décoder en 32 octets.");
  }
  return key;
}

export function encryptTokenSet(tokens: OAuthTokenSet): EncryptedTokenBlob {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const payload = Buffer.from(JSON.stringify(tokens), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptTokenSet(blob: EncryptedTokenBlob): OAuthTokenSet {
  const key = loadKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ]);
  const parsed = JSON.parse(plain.toString("utf8")) as OAuthTokenSet;
  if (!parsed.accessToken || !parsed.expiresAt) {
    throw new Error("Jeton PA illisible après déchiffrement.");
  }
  return parsed;
}

export function isAccessTokenExpired(tokens: OAuthTokenSet, now = new Date(), skewMs = 60_000): boolean {
  return new Date(tokens.expiresAt).getTime() <= now.getTime() + skewMs;
}
