import { useEffect, useRef, useState, type RefObject } from "react";

type Options = {
  /** Conteneur scrollable ; par défaut = fenêtre (landing). */
  scrollRoot?: RefObject<HTMLElement | null>;
  threshold?: number;
  delta?: number;
  /** Écoute la molette (desktop landing). */
  wheel?: boolean;
};

function getWindowScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function getScrollY(scrollRoot?: RefObject<HTMLElement | null>): number {
  const el = scrollRoot?.current;
  const windowY = getWindowScrollY();
  if (el) return Math.max(el.scrollTop, windowY);
  return windowY;
}

/** Masque le header au scroll vers le bas, le réaffiche au scroll vers le haut. */
export function useScrollHideHeader({
  scrollRoot,
  threshold = 24,
  delta = 4,
  wheel = false,
}: Options = {}) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = getScrollY(scrollRoot);

    function applyScroll(y: number) {
      if (y <= threshold) {
        setVisible(true);
        lastY.current = y;
        return;
      }
      const dy = y - lastY.current;
      if (dy > delta) setVisible(false);
      else if (dy < -delta) setVisible(true);
      lastY.current = y;
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        applyScroll(getScrollY(scrollRoot));
        ticking.current = false;
      });
    }

    function onWheel(e: WheelEvent) {
      if (!wheel) return;
      const y = getScrollY(scrollRoot);
      if (y <= threshold) {
        setVisible(true);
        return;
      }
      if (Math.abs(e.deltaY) > 8) setVisible(e.deltaY < 0);
    }

    const el = scrollRoot?.current;
    el?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    if (wheel) window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      el?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      if (wheel) window.removeEventListener("wheel", onWheel);
    };
  }, [scrollRoot, threshold, delta, wheel]);

  return visible;
}
