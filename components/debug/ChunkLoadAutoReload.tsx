"use client";

import { useEffect } from "react";

function shouldReloadFromErrorMessage(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("chunkloaderror") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("failed to fetch dynamically imported module")
  );
}

/**
 * En dev, Next peut régénérer des chunks et le navigateur tente encore de charger l’ancien fichier → ChunkLoadError.
 * On recharge automatiquement avec cache-busting (quelques tentatives max) pour éviter l’écran rouge pendant la navigation.
 */
export function ChunkLoadAutoReload() {
  useEffect(() => {
    const key = "FLOWO_CHUNK_RELOAD_META_V2";

    function reloadBusted(reason: string) {
      try {
        const raw = sessionStorage.getItem(key);
        const meta = raw ? (JSON.parse(raw) as { count?: number; firstAt?: number }) : {};
        const now = Date.now();
        const firstAt = typeof meta.firstAt === "number" ? meta.firstAt : now;
        const count = typeof meta.count === "number" ? meta.count : 0;

        // Max 3 rechargements sur 10 minutes (anti-boucle)
        const windowMs = 10 * 60 * 1000;
        const reset = now - firstAt > windowMs;
        const nextCount = reset ? 1 : count + 1;
        const nextFirstAt = reset ? now : firstAt;
        if (!reset && count >= 3) return;
        sessionStorage.setItem(key, JSON.stringify({ count: nextCount, firstAt: nextFirstAt }));
      } catch {
        // si sessionStorage indisponible, on tente quand même
      }
      console.warn("[Flowo] Auto-reload (ChunkLoadError):", reason);
      // Cache-busting: change l'URL (sans casser la route) pour forcer le re-téléchargement des chunks.
      const u = new URL(window.location.href);
      u.searchParams.set("__flowo_reload", String(Date.now()));
      window.location.replace(u.toString());
    }

    function onError(ev: Event) {
      const ee = ev as ErrorEvent;
      const msg = typeof ee.message === "string" ? ee.message : "";
      if (msg && shouldReloadFromErrorMessage(msg)) reloadBusted(msg);
    }

    function onRejection(ev: PromiseRejectionEvent) {
      const r = ev.reason as { message?: unknown; name?: unknown };
      const msg =
        typeof r?.message === "string"
          ? r.message
          : typeof ev.reason === "string"
            ? ev.reason
            : String(ev.reason ?? "");
      if (msg && shouldReloadFromErrorMessage(msg)) reloadBusted(msg);
    }

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection, true);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection, true);
    };
  }, []);

  return null;
}

