"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { APP_NAME } from "@/lib/app-branding";
import { cx } from "@/lib/utils";

function getScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export function MarketingHeader() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = getScrollY();

    function applyScroll(y: number) {
      if (y <= 40) {
        setVisible(true);
        lastY.current = y;
        return;
      }
      const delta = y - lastY.current;
      if (delta > 6) setVisible(false);
      else if (delta < -6) setVisible(true);
      lastY.current = y;
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        applyScroll(getScrollY());
        ticking.current = false;
      });
    }

    function onWheel(e: WheelEvent) {
      const y = getScrollY();
      if (y <= 40) {
        setVisible(true);
        return;
      }
      if (Math.abs(e.deltaY) > 8) {
        setVisible(e.deltaY < 0);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 border-b border-slate-200 bg-[var(--background)] shadow-sm transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-gray-950",
        visible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="inline-flex items-center py-0.5 pl-0.5">
          <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/#tarifs"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 sm:inline dark:text-slate-300"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 sm:inline dark:text-slate-300"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md md:px-5"
          >
            Essayer gratuitement
          </Link>
        </div>
      </div>
    </header>
  );
}
