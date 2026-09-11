import { loggingEnabled } from "@/lib/debug-session-append";

/** GET avec UA réel sans exécuter le bundle JS (balise `<img>`). Complète `beforeInteractive` si bloqué. */
export function DebugImgPing() {
  if (!loggingEnabled()) return null;
  const n = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sonde UA debug
    <img
      src={`/api/debug/session-log?imgping=v1&n=${encodeURIComponent(n)}`}
      alt=""
      width={1}
      height={1}
      className="absolute h-px w-px overflow-hidden opacity-0"
      loading="eager"
      decoding="sync"
      fetchPriority="low"
    />
  );
}
