import {
  appendDebugSessionEntry,
  loggingEnabled,
  resolveDebugLogAbsolutePath,
} from "@/lib/debug-session-append";
import { headers } from "next/headers";

/** Pas de `cache()` : une entrée NDJSON à chaque rendu serveur du layout racine (évite dédup prématurée RSC/stream). */

export async function DebugRootLayoutVisit() {
  if (!loggingEnabled()) return null;

  try {
    const h = await headers();
    const ua = (h.get("user-agent") ?? "").slice(0, 260);
    await appendDebugSessionEntry({
      hypothesisId: "server-root-layout-hit",
      location: "DebugRootLayoutVisit.tsx",
      message: "RSC root layout rendu (sans cache React)",
      data: {
        ua: ua || null,
        uaLikelyBrowser: /Mozilla|Safari|Chrome|Firefox|Edge|Opera|\bEdg\b/i.test(ua),
        host: h.get("host"),
        fwdHost: h.get("x-forwarded-host"),
        fwdProto: h.get("x-forwarded-proto"),
        resolvedLogPath: resolveDebugLogAbsolutePath(),
        nodeEnv: process.env.NODE_ENV ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    try {
      await appendDebugSessionEntry({
        hypothesisId: "server-root-layout-err",
        location: "DebugRootLayoutVisit.tsx:catch",
        message: "Échec instrumentation root layout (voir data.err)",
        data: {
          err: msg.slice(0, 600),
          resolvedLogPath: resolveDebugLogAbsolutePath(),
          nodeEnv: process.env.NODE_ENV ?? null,
        },
      });
    } catch {
      /* */
    }
    console.error("[CRM-debug-0f238e] DebugRootLayoutVisit:", err);
  }
  return null;
}
