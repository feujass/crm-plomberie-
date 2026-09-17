"use client";

import { cx } from "@/lib/utils";

/**
 * Fond “vague grise” léger (sans WebGL) pour la page de connexion.
 * Objectif : rendu premium sur mobile, sans coût perf.
 */
export function BackgroundWave({ className }: { className?: string }) {
  return (
    <div className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* Base sombre (bleu/noir) */}
      <div className="absolute inset-0 bg-[#090b13]" />

      {/* Lueurs très subtiles (haut) */}
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.28),transparent_65%)] blur-2xl" />
      <div className="absolute -top-24 left-1/4 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.20),transparent_65%)] blur-2xl" />

      {/* “Vague” grise en bas (style 21st / paper shader) */}
      <div className="absolute -bottom-52 left-1/2 h-[760px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),rgba(255,255,255,0.08)_32%,transparent_62%)] blur-3xl" />
      <div className="absolute -bottom-72 left-[15%] h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_60%)] blur-3xl" />

      {/* Vignette douce */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

