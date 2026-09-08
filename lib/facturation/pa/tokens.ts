import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { OAuthTokenSet } from "@/lib/facturation/pa/types";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const DEFAULT_KEY_ID = "v1";

export interface EncryptedTokenBlob {
  ciphertext: string;
  iv: string;
  authTag: string;
  /** Version de clé utilisée pour ce blob. Obligatoire à l’écriture ; défaut v1 à la lecture. */
  keyId: string;
}

function parseAesKey(raw: string, label: string): Buffer {
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) {
    throw new Error(`${label} doit décoder en 32 octets.`);
  }
  return key;
}

export function currentEncryptionKeyId(): string {
  return process.env.EINVOICING_TOKEN_ENCRYPTION_KEY_ID?.trim() || DEFAULT_KEY_ID;
}

function currentKey(): Buffer {
  const raw = process.env.EINVOICING_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("EINVOICING_TOKEN_ENCRYPTION_KEY manquant (32 octets en base64).");
  }
  return parseAesKey(raw, "EINVOICING_TOKEN_ENCRYPTION_KEY");
}

function previousKeys(): Map<string, Buffer> {
  const ring = new Map<string, Buffer>();
  const extra = process.env.EINVOICING_TOKEN_ENCRYPTION_KEYS?.trim();
  if (!extra) return ring;
  let parsed: unknown;
  try {
    parsed = JSON.parse(extra);
  } catch {
    throw new Error("EINVOICING_TOKEN_ENCRYPTION_KEYS doit être un JSON { \"id\": \"base64\" }.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EINVOICING_TOKEN_ENCRYPTION_KEYS doit être un objet JSON d’identifiants vers des clés.");
  }
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== "string") {
      throw new Error(`EINVOICING_TOKEN_ENCRYPTION_KEYS.${id} doit être une chaîne base64.`);
    }
    ring.set(id, parseAesKey(value, `EINVOICING_TOKEN_ENCRYPTION_KEYS.${id}`));
  }
  return ring;
}

function keyForId(keyId: string): Buffer {
  if (keyId === currentEncryptionKeyId()) return currentKey();
  const previous = previousKeys().get(keyId);
  if (!previous) {
    throw new Error(
      `Clé de chiffrement PA inconnue: ${keyId}. Ajoutez-la à EINVOICING_TOKEN_ENCRYPTION_KEYS avant de retirer EINVOICING_TOKEN_ENCRYPTION_KEY.`,
    );
  }
  return previous;
}

export function encryptTokenSet(tokens: OAuthTokenSet): EncryptedTokenBlob {
  const keyId = currentEncryptionKeyId();
  const key = currentKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const payload = Buffer.from(JSON.stringify(tokens), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyId,
  };
}

export function decryptTokenSet(blob: EncryptedTokenBlob): OAuthTokenSet {
  const keyId = blob.keyId?.trim() || DEFAULT_KEY_ID;
  const key = keyForId(keyId);
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

export function encryptedWithCurrentKey(blob: EncryptedTokenBlob): boolean {
  return (blob.keyId?.trim() || DEFAULT_KEY_ID) === currentEncryptionKeyId();
}

/** Déchiffre, puis re-chiffre avec la clé courante si le blob utilise une ancienne version. */
export function decryptAndMaybeRotate(blob: EncryptedTokenBlob): {
  tokens: OAuthTokenSet;
  blob: EncryptedTokenBlob;
  rotated: boolean;
} {
  const tokens = decryptTokenSet(blob);
  if (encryptedWithCurrentKey(blob)) {
    return { tokens, blob, rotated: false };
  }
  return { tokens, blob: encryptTokenSet(tokens), rotated: true };
}

export function isAccessTokenExpired(tokens: OAuthTokenSet, now = new Date(), skewMs = 60_000): boolean {
  return new Date(tokens.expiresAt).getTime() <= now.getTime() + skewMs;
}

export function oauthTokenSetsDiffer(a: OAuthTokenSet, b: OAuthTokenSet): boolean {
  return a.accessToken !== b.accessToken || a.refreshToken !== b.refreshToken || a.expiresAt !== b.expiresAt;
}
