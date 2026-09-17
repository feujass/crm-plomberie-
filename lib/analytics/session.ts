const SESSION_KEY = "flowo_analytics_session_id";
const SESSION_META_KEY = "flowo_analytics_session_meta";

/** Aligné sur l'attribution session (30 min d'inactivité). */
const SESSION_TTL_MS = 30 * 60 * 1000;

type SessionMeta = {
  id: string;
  lastActivityAt: number;
};

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readSessionMeta(): SessionMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionMeta;
    if (!parsed?.id || typeof parsed.lastActivityAt !== "number") return null;
    if (Date.now() - parsed.lastActivityAt > SESSION_TTL_MS) {
      window.sessionStorage.removeItem(SESSION_META_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionMeta(id: string): string {
  if (typeof window !== "undefined") {
    try {
      const meta: SessionMeta = { id, lastActivityAt: Date.now() };
      window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
      window.sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      /* */
    }
  }
  return id;
}

function touchSessionMeta(): void {
  const meta = readSessionMeta();
  if (!meta) return;
  writeSessionMeta(meta.id);
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return generateSessionId();

  const meta = readSessionMeta();
  if (meta) {
    touchSessionMeta();
    return meta.id;
  }

  try {
    const legacy = window.localStorage.getItem(SESSION_KEY);
    if (legacy) {
      window.localStorage.removeItem(SESSION_KEY);
      return writeSessionMeta(legacy);
    }
  } catch {
    /* */
  }

  return writeSessionMeta(generateSessionId());
}
