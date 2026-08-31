const SESSION_KEY = "flowo_analytics_session_id";

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

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return generateSessionId();
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return generateSessionId();
  }
}
