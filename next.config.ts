import type { NextConfig } from "next";
import path from "path";

/** Racine repo (visible par Git/IDE) ; `.cursor/` ne se synchronisait pas toujours avec l’assistant. */
const SESSION_DEBUG_ABS = path.join(__dirname, "debug-session-0f238e.ndjson");

/** Ex. LAN : NEXT_EXTRA_ALLOWED_ORIGINS=192.168.1.42,10.0.0.5 (voir .env.example) — évite E394 CSRF si accès par IP locale. */
function extraAllowedOrigins(): string[] {
  const raw = process.env.NEXT_EXTRA_ALLOWED_ORIGINS;
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Hôte public depuis `NEXT_PUBLIC_SITE_URL` (prod / préprod) — souvent absent de la liste « localhost » seule → E394. */
function hostnameFromSiteUrlEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return [];
  try {
    const u = new URL(raw);
    const h = u.hostname;
    if (!h) return [];
    /** `www`/apex sans `www` : `Origin` diffère alors que NEXT_PUBLIC_SITE_URL n’en retient qu’un → CSRF/E394. */
    const hosts = new Set<string>([h]);
    if (h.startsWith("www.")) {
      hosts.add(h.slice(4));
    } else {
      const skipWwwAlias =
        h === "localhost" ||
        /\.localhost$/i.test(h) ||
        /^127\.0\.0\.1$/i.test(h) ||
        h === "[::1]" ||
        h === "::1";
      if (!skipWwwAlias) hosts.add(`www.${h}`);
    }
    return [...hosts];
  } catch {
    return [];
  }
}

/** Vercel fournit `VERCEL_URL` sans schéma (ex. `*.vercel.app`). */
function hostnamesFromVercelEnv(): string[] {
  const out: string[] = [];
  for (const raw of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    const s = raw?.trim();
    if (!s) continue;
    try {
      const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      const h = new URL(withProto).hostname;
      if (h) out.push(h);
    } catch {
      /* */
    }
  }
  return out;
}

/** `new URL(origin).host` inclut le port (ex. 127.0.0.1:3001). `csrf-protection.js` compare en chaîne exacte : `127.0.0.1` ≠ `127.0.0.1:3001` — E80 puis réponse non conforme Flight → E394. */
function hasExplicitTcpPort(hostLike: string): boolean {
  return /(^[^[]+:\d+$)|(^\[[^\]]+\]:\d+$)/.test(hostLike);
}

function isWildcardOriginPattern(origin: string): boolean {
  return origin.includes("*");
}

/** Duplique chaque hôte littéral avec `:port` (dev / tunnel où Origin ≠ Host et la whitelist doit matcher `host:port`). */
function expandLiteralsWithDevPorts(origins: string[]): string[] {
  const ports = new Set(["3000", "3001", "5173", "8080", "4000"]);
  const envPort = process.env.PORT?.trim();
  if (envPort) ports.add(envPort);

  const out = new Set<string>();
  for (const origin of origins) {
    out.add(origin);
    if (isWildcardOriginPattern(origin)) continue;
    if (origin.startsWith("::")) continue;
    if (hasExplicitTcpPort(origin)) continue;
    for (const p of ports) {
      out.add(`${origin}:${p}`);
    }
  }
  return [...out];
}

/** Compara Origin/Host dans `action-handler.js` (`new URL(origin).host`). IPv6/LAN en doublon .env avec NEXT_EXTRA_ALLOWED_ORIGINS. */
function serverActionsAllowedOrigins(): string[] {
  return expandLiteralsWithDevPorts([
    "localhost",
    "127.0.0.1",
    "::1",
    "[::1]",
    "*.localhost",
    "*.local",
    ...hostnameFromSiteUrlEnv(),
    ...hostnamesFromVercelEnv(),
    ...extraAllowedOrigins(),
  ]);
}

const nextConfig: NextConfig = {
  /** Accessible côté serveur Route Handlers pour `resolveDebugLogAbsolutePath()` sans dépendre du cwd. */
  env: {
    CRM_SESSION_DEBUG_FILE_ABS: SESSION_DEBUG_ABS,
    /** Évalué au chargement de ce fichier : évite que le bundler enlève tout `loggingEnabled()` hors `SESSION_DEBUG_LOG`. */
    CRM_NEXT_IS_DEV_TUNNEL:
      process.env.NODE_ENV !== "production" ? "1" : "0",
  },
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { dev }) => {
    if (dev) {
      const root = __dirname;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          // Évite des recompils HMR causées par des logs/artefacts locaux
          "**/*.ndjson",
          "**/*-peek.json",
          "**/.cursor/**",
          "**/agent-transcripts/**",
          path.join(root, "public/_crm_browser_probe.json"),
          path.join(root, "_incoming/**"),
          path.join(root, "backend/.venv/**"),
          path.join(root, "mobile/node_modules/**"),
        ],
      };
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      /** localhost vs 127.0.0.1, LAN, proxy — sinon vérif. CSRF (Server Actions / protocoles internes) peut renvoyer une réponse non‑Flight (E394). */
      allowedOrigins: serverActionsAllowedOrigins(),
    },
  },
};

export default nextConfig;
