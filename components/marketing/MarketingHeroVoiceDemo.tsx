"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Mic, Square, Type } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { trackFunnelEvent } from "@/lib/analytics/funnel";
import type { DemoPreviewPayload } from "@/lib/demo/types";
import { listenForSpeech, isBrowserSpeechRecognitionSupported } from "@/lib/voice/browserSpeechRecognition";
import { DemoAudioRecorder, DEMO_MAX_RECORDING_MS } from "@/lib/voice/demo-recorder";
import { cx, focusRing } from "@/lib/utils";

const ZEUS_AVATAR = "/zeus-avatar.png";
const GENERATE_TIMEOUT_MS = 30_000;

type Phase = "idle" | "recording" | "processing" | "preview" | "rate_limited" | "error";

function formatSeconds(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MarketingHeroVoiceDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wave, setWave] = useState(0);
  const [textFallback, setTextFallback] = useState("");
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DemoPreviewPayload | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const recorderRef = useRef<DemoAudioRecorder | null>(null);
  const speechRef = useRef<{ stop: () => void; promise: Promise<string> } | null>(null);
  const timerRef = useRef<number | null>(null);
  const speechTranscriptRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/demo/status");
        const json = (await res.json()) as { used?: boolean; preview?: DemoPreviewPayload };
        if (cancelled || !json.used || !json.preview) return;
        setPreview(json.preview);
        setPhase("preview");
      } catch {
        /* première visite */
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      speechRef.current?.stop();
      recorderRef.current?.abort();
    };
  }, []);

  const stopTimers = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const runGenerate = useCallback(async (text: string, source: "voice" | "text") => {
    setPhase("processing");
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

    try {
      const res = await fetch("/api/public/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => ({}))) as DemoPreviewPayload & {
        message?: string;
        code?: string;
        reason?: string;
      };

      if (res.status === 429 || json.code === "rate_limited") {
        trackFunnelEvent("demo_rate_limited", { properties: { reason: json.reason ?? "unknown" } });
        setRateLimitMessage(json.message ?? "Limite démo atteinte.");
        setPhase("rate_limited");
        return;
      }

      if (res.status === 409 || json.code === "demo_already_used") {
        setPreview({
          demo_quote_id: json.demo_quote_id,
          preview_image_base64: json.preview_image_base64,
          preview_lines: json.preview_lines,
          line_count: json.line_count,
          total_ttc: json.total_ttc,
        });
        setPhase("preview");
        return;
      }

      if (!res.ok) {
        trackFunnelEvent("demo_generation_error", {
          properties: { reason: json.code ?? "unknown", message: json.message ?? "error" },
        });
        setError(json.message ?? "Génération impossible. Réessaie.");
        setPhase("error");
        return;
      }

      trackFunnelEvent("demo_generation_success", {
        properties: { source, line_count: json.line_count, total_ttc: json.total_ttc },
      });
      setPreview(json);
      setPhase("preview");
      trackFunnelEvent("demo_preview_shown", { properties: { demo_quote_id: json.demo_quote_id } });
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      trackFunnelEvent("demo_generation_error", {
        properties: { reason: aborted ? "timeout" : "network" },
      });
      setError(aborted ? "Zeus met trop de temps. Réessaie avec une description plus courte." : "Erreur réseau.");
      setPhase("error");
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  const finishRecording = useCallback(async () => {
    stopTimers();
    setPhase("processing");
    setError(null);

    let transcript = speechTranscriptRef.current.trim();
    let durationMs = elapsedMs;
    const speech = speechRef.current;
    speechRef.current = null;

    if (speech) {
      speech.stop();
      try {
        transcript = (await Promise.race([
          speech.promise,
          new Promise<string>((_, reject) =>
            window.setTimeout(() => reject(new Error("speech_timeout")), 5000),
          ),
        ])).trim();
        speechTranscriptRef.current = transcript;
      } catch {
        transcript = speechTranscriptRef.current.trim();
      }
    }

    try {
      const rec = recorderRef.current;
      if (rec && !transcript) {
        const stopped = await rec.stop();
        durationMs = stopped.durationMs;
        if (stopped.blob.size > 0) {
          const form = new FormData();
          form.append("audio", stopped.blob, stopped.mimeType.includes("mp4") ? "demo.m4a" : "demo.webm");
          const tr = await fetch("/api/public/demo/transcribe", { method: "POST", body: form });
          const trJson = (await tr.json().catch(() => ({}))) as { transcript?: string; message?: string; code?: string };
          if (tr.ok && trJson.transcript) {
            transcript = trJson.transcript.trim();
          } else if (trJson.code === "transcription_unconfigured") {
            setShowText(true);
            throw new Error("Écris ton chantier ci-dessous — la transcription vocale n'est pas disponible sur ce navigateur.");
          } else if (!transcript) {
            throw new Error(trJson.message ?? "Transcription impossible");
          }
        }
      } else if (rec) {
        rec.abort();
      }
    } catch (e) {
      recorderRef.current = null;
      const msg = e instanceof Error ? e.message : "Enregistrement impossible";
      trackFunnelEvent("demo_generation_error", { properties: { reason: "transcription", message: msg } });
      setError(msg);
      setPhase("error");
      return;
    }

    recorderRef.current = null;
    trackFunnelEvent("demo_recording_complete", {
      properties: { duration_ms: durationMs, transcript_len: transcript.length },
    });

    if (!transcript) {
      setShowText(true);
      setError("Aucune parole détectée. Réessaie ou écris ton chantier ci-dessous.");
      setPhase("error");
      return;
    }

    await runGenerate(transcript, "voice");
  }, [elapsedMs, runGenerate]);

  const startRecording = async () => {
    setError(null);
    setPreview(null);
    setRateLimitMessage(null);
    speechTranscriptRef.current = "";
    trackFunnelEvent("demo_start", { properties: { source: "hero" } });

    const useBrowserSpeech = isBrowserSpeechRecognitionSupported();

    try {
      if (useBrowserSpeech) {
        const speech = listenForSpeech({
          lang: "fr-FR",
          onInterim: (text) => {
            if (text) speechTranscriptRef.current = text;
          },
        });
        speechRef.current = speech;
        speech.promise
          .then((t) => {
            speechTranscriptRef.current = t;
          })
          .catch(() => {
            /* secours en fin d'enregistrement */
          });
      } else {
        const rec = new DemoAudioRecorder();
        recorderRef.current = rec;
        await rec.start(() => setWave((w) => (w + 1) % 5));
      }

      setPhase("recording");
      setElapsedMs(0);
      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - started;
        setElapsedMs(ms);
        setWave((w) => (w + 1) % 5);
        if (ms >= DEMO_MAX_RECORDING_MS) void finishRecording();
      }, 200);

      trackFunnelEvent("demo_mic_permission_granted");
    } catch {
      trackFunnelEvent("demo_mic_permission_denied");
      setShowText(true);
      setError("Micro refusé ou indisponible. Écris ton chantier ci-dessous.");
      setPhase("error");
    }
  };

  const onTextSubmit = async () => {
    const text = textFallback.trim();
    if (text.length < 12) {
      setError("Décris ton chantier en au moins une phrase.");
      return;
    }
    trackFunnelEvent("demo_text_fallback_used");
    await runGenerate(text, "text");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[color:var(--primary)]/30">
          <Image src={ZEUS_AVATAR} alt="Zeus" fill className="object-cover object-[center_18%]" sizes="48px" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Essaie Zeus maintenant</p>
          <p className="text-xs text-slate-500">Aucune inscription · Décris un chantier, tu as ton devis</p>
        </div>
      </div>

      {phase === "preview" && preview ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Ton devis est prêt ({preview.line_count} lignes). Crée ton compte pour le voir en entier et l&apos;envoyer à ton client.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${preview.preview_image_base64}`}
            alt="Aperçu devis flouté"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
          />
          <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {preview.preview_lines.map((l) => (
              <li key={l.designation}>
                ✓ {l.designation} — {l.quantite} {l.unite}
              </li>
            ))}
          </ul>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            Total TTC : {preview.total_ttc.toFixed(2)} €
          </p>
          <Link
            href="/register?from=demo"
            onClick={() => trackFunnelEvent("demo_cta_signup_click", { properties: { from: "hero_preview" } })}
            className={cx(
              focusRing,
              "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-6 text-sm font-semibold text-white",
            )}
          >
            Créer mon compte — voir le devis complet
          </Link>
        </div>
      ) : phase === "rate_limited" ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{rateLimitMessage}</p>
          <Link
            href="/register?from=demo"
            onClick={() => trackFunnelEvent("demo_cta_signup_click", { properties: { from: "rate_limited" } })}
            className={cx(focusRing, "inline-flex min-h-11 items-center justify-center rounded-xl bg-[color:var(--primary)] px-6 text-sm font-semibold text-white")}
          >
            Créer mon compte — essai gratuit 14 jours
          </Link>
        </div>
      ) : (
        <>
          {phase === "recording" && (
            <div className="mb-4 flex items-end justify-center gap-1 h-10">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-[color:var(--primary)] transition-all duration-150"
                  style={{ height: `${12 + ((wave + i) % 5) * 8}px` }}
                />
              ))}
            </div>
          )}

          {phase === "processing" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-sm text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--primary)]" />
              Zeus rédige ton devis…
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {phase === "recording" ? (
                <>
                  <p className="text-center text-sm font-medium text-red-600">{formatSeconds(elapsedMs)} / 1:00</p>
                  <button
                    type="button"
                    onClick={() => void finishRecording()}
                    className={cx(
                      focusRing,
                      "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-base font-semibold text-white",
                    )}
                  >
                    <Square className="h-5 w-5 fill-current" />
                    Terminer
                  </button>
                </>
              ) : (
                <button
                  id="hero-demo-mic"
                  type="button"
                  onClick={() => void startRecording()}
                  className={cx(
                    focusRing,
                    "inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[color:var(--primary)] px-6 text-base font-semibold text-white shadow-md",
                  )}
                >
                  <Mic className="h-6 w-6" />
                  Appuie et décris ton chantier
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowText((v) => !v)}
                className="inline-flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700"
              >
                <Type className="h-3.5 w-3.5" />
                {showText ? "Masquer le texte" : "Ou écris ton chantier"}
              </button>

              {showText && phase !== "recording" && (
                <div className="space-y-2">
                  <textarea
                    value={textFallback}
                    onChange={(e) => setTextFallback(e.target.value)}
                    rows={3}
                    placeholder="Ex. : remplacement chauffe-eau 200L, 4h MO, déplacement…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => void onTextSubmit()}
                    className={cx(
                      focusRing,
                      "inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800",
                    )}
                  >
                    Générer mon aperçu
                  </button>
                </div>
              )}
            </div>
          )}

          {error && phase === "error" && (
            <p className="mt-3 text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
