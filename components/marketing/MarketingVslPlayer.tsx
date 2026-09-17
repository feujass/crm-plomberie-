"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";
import { cx, focusRing } from "@/lib/utils";

const DEFAULT_VSL_SRC = "/videos/flowo-vsl-web.mp4";
const POSTER_SRC = "/video-poster.svg";
const VTT_SRC = "/videos/flowo-vsl-web.fr.vtt";

function vslSrc(): string {
  const fromEnv = process.env.NEXT_PUBLIC_VSL_VIDEO_URL?.trim();
  return fromEnv || DEFAULT_VSL_SRC;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function MarketingVslPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [userUnmuted, setUserUnmuted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const quartilesSent = useRef(new Set<number>());

  const trackQuartile = useCallback((ratio: number) => {
    const pct = ratio >= 1 ? 100 : ratio >= 0.75 ? 75 : ratio >= 0.5 ? 50 : ratio >= 0.25 ? 25 : 0;
    if (!pct || quartilesSent.current.has(pct)) return;
    quartilesSent.current.add(pct);
    const name = pct === 100 ? "video_complete" : (`video_${pct}` as "video_25" | "video_50" | "video_75");
    trackFunnelEvent(name);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reducedMotion) return;

    el.muted = true;
    void el.play().catch(() => undefined);
  }, [reducedMotion]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPlay = () => trackFunnelEvent("video_play");
    const onTimeUpdate = () => {
      if (!el.duration || !Number.isFinite(el.duration)) return;
      trackQuartile(el.currentTime / el.duration);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [trackQuartile]);

  function toggleSound() {
    const el = videoRef.current;
    if (!el) return;
    if (muted) {
      el.currentTime = 0;
      el.muted = false;
      setMuted(false);
      setUserUnmuted(true);
      void el.play().catch(() => setError(true));
      return;
    }
    el.muted = true;
    setMuted(true);
  }

  if (error) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-slate-900 p-6 text-center text-slate-300">
        <p className="text-sm font-medium">Vidéo indisponible</p>
        <p className="text-xs text-slate-400">
          Placez <code className="text-slate-300">flowo-vsl-web.mp4</code> dans{" "}
          <code className="text-slate-300">public/videos/</code>.
        </p>
      </div>
    );
  }

  const autoplay = !reducedMotion;

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={POSTER_SRC}
        playsInline
        loop
        muted={muted}
        autoPlay={autoplay}
        controls={userUnmuted || reducedMotion}
        preload="metadata"
        aria-label="Vidéo de présentation Flowo et Zeus"
        onError={() => setError(true)}
      >
        <source src={vslSrc()} type="video/mp4" />
        <track kind="subtitles" srcLang="fr" label="Français" src={VTT_SRC} default />
        Ton navigateur ne prend pas en charge la lecture vidéo.
      </video>

      <button
        type="button"
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className={cx(
          "absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70",
          focusRing,
        )}
        onClick={toggleSound}
      >
        {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
