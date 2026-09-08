const SECRET_KEYS = new Set([
  "accesstoken",
  "refreshtoken",
  "access_token",
  "refresh_token",
  "authorization",
  "client_secret",
  "clientsecret",
  "ciphertext",
]);

function isSecretKey(key: string): boolean {
  const n = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECRET_KEYS.has(n) || n.includes("token") || n.includes("secret");
}

/** Jamais logger un jeton : remplace les champs sensibles par [redacted]. */
export function redactSecrets(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.startsWith("Bearer ")) return "Bearer [redacted]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSecretKey(k) ? "[redacted]" : redactSecrets(v);
    }
    return out;
  }
  return value;
}

export function assertNoSecretInLog(message: string): void {
  if (/Bearer\s+[A-Za-z0-9._\-]+/.test(message) && !message.includes("[redacted]")) {
    throw new Error("Tentative de log d’un jeton PA — bloqué.");
  }
}
