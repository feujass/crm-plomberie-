"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Mic, Square, Type } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DemoQuotePreview,
  demoPricesComplete,
  type DemoEditableLine,
} from "@/components/marketing/DemoQuotePreview";
import { trackFunnelEvent } from "@/lib/analytics/funnel";
import type { DemoPreviewPayload } from "@/lib/demo/types";
import { useInAppBrowser } from "@/lib/use-in-app-browser";
import { listenForSpeech, isBrowserSpeechRecognitionSupported } from "@/lib/voice/browserSpeechRecognition";
import { DemoAudioRecorder, DEMO_MAX_RECORDING_MS } from "@/lib/voice/demo-recorder";
import { cx, focusRing } from "@/lib/utils";

const ZEUS_AVATAR = "/zeus-avatar.png";
const GENERATE_TIMEOUT_MS = 30_000;

type Phase = "idle" | "recording" | "processing" | "preview" | "rate_limited" | "error";

type DemoResult = {
  lines: DemoEditableLine[];
  transcriptBrut: string | null;
  transcriptCorrige: string | null;
  reason: string | null;
  tvaRate: number | null | undefined;
  validationPassed: boolean;
};

function prixToInput(value: number | null | undefined): string {
  return typeof value === "number" && value > 0 ? String(value) : "";
}

function linesFromPreview(lines: DemoPreviewPayload["preview_lines"]): DemoEditableLine[] {
  return lines.map((line) => ({
    designation: line.designation,
    quantite: line.quantite || 1,
    unite: line.unite || "forfait",
    prix: prixToInput(line.prix_ht),
    tva: line.tva,
  }));
}

function formatSeconds(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MarketingHeroVoiceDemo() {
  const { isInApp, ready } = useInAppBrowser();
  const inApp = ready && isInApp;
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wave, setWave] = useState(0);
  const [textFallback, setTextFallback] = useState("");
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const editedLinesRef = useRef<Set<number>>(new Set());

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
        setResult({
          lines: linesFromPreview(json.preview.preview_lines),
          transcriptBrut: json.preview.transcription_brute ?? null,
          transcriptCorrige: json.preview.transcription_corrigee ?? null,
          reason: null,
          tvaRate: json.preview.tva_rate,
          validationPassed: true,
        });
        setPhase("preview");
        if (json.preview.transcription_corrigee || json.preview.transcription_brute) {
          trackFunnelEvent("demo_transcript_shown", {
            properties: {
              transcription_brute: json.preview.transcription_brute ?? null,
              transcription_corrigee: json.preview.transcription_corrigee ?? null,
              validation_passed: true,
              source: "replay",
            },
          });
        }
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

  useEffect(() => {
    if (inApp) setShowText(true);
  }, [inApp]);

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
        needs_confirmation?: boolean;
        failures?: { code?: string; message?: string }[];
        lignes?: { designation: string; quantite?: number; unite?: string; prix_ht?: number | null; source?: string | null }[];
        tva_rate?: number | null;
        total_ht?: number;
        transcription_brute?: string | null;
        transcription_corrigee?: string | null;
      };

      if (res.status === 429 || json.code === "rate_limited") {
        trackFunnelEvent("demo_rate_limited", { properties: { reason: json.reason ?? "unknown" } });
        setRateLimitMessage(json.message ?? "Limite démo atteinte.");
        setPhase("rate_limited");
        return;
      }

      if (res.status === 409 || json.code === "demo_already_used") {
        setResult({
          lines: linesFromPreview(json.preview_lines ?? []),
          transcriptBrut: json.transcription_brute ?? null,
          transcriptCorrige: json.transcription_corrigee ?? null,
          reason: null,
          tvaRate: json.tva_rate,
          validationPassed: true,
        });
        setPhase("preview");
        trackFunnelEvent("demo_transcript_shown", {
          properties: {
            transcription_brute: json.transcription_brute ?? null,
            transcription_corrigee: json.transcription_corrigee ?? null,
            validation_passed: true,
            source: "replay",
          },
        });
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

      if (json.needs_confirmation) {
        const reason =
          json.reason ??
          json.failures?.find((failure) => failure.code && failure.code !== "incomplete_price")?.message ??
          null;
        editedLinesRef.current = new Set();
        setResult({
          lines: (json.lignes ?? []).map((ligne) => ({
            designation: ligne.designation,
            quantite: ligne.quantite || 1,
            unite: ligne.unite || "forfait",
            prix: prixToInput(ligne.prix_ht),
            tva: json.tva_rate ?? undefined,
          })),
          transcriptBrut: json.transcription_brute ?? null,
          transcriptCorrige: json.transcription_corrigee ?? null,
          reason,
          tvaRate: json.tva_rate,
          validationPassed: false,
        });
        setPhase("preview");
        trackFunnelEvent("demo_confirmation_shown", {
          properties: { reason: reason ?? json.failures?.[0]?.code ?? "incomplete", source },
        });
        trackFunnelEvent("demo_transcript_shown", {
          properties: {
            transcription_brute: json.transcription_brute ?? null,
            transcription_corrigee: json.transcription_corrigee ?? null,
            validation_passed: false,
            source,
          },
        });
        return;
      }

      trackFunnelEvent("demo_generation_success", {
        properties: { source, line_count: json.line_count, total_ttc: json.total_ttc },
      });
      editedLinesRef.current = new Set();
      setResult({
        lines: linesFromPreview(json.preview_lines ?? []),
        transcriptBrut: json.transcription_brute ?? null,
        transcriptCorrige: json.transcription_corrigee ?? null,
        reason: null,
        tvaRate: json.tva_rate,
        validationPassed: true,
      });
      setPhase("preview");
      trackFunnelEvent("demo_preview_shown", { properties: { demo_quote_id: json.demo_quote_id } });
      trackFunnelEvent("demo_transcript_shown", {
        properties: {
          transcription_brute: json.transcription_brute ?? null,
          transcription_corrigee: json.transcription_corrigee ?? null,
          validation_passed: true,
          source,
        },
      });
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
    setResult(null);
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-5 md:p-6">
      <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[color:var(--primary)]/30 sm:h-12 sm:w-12">
          <Image src={ZEUS_AVATAR} alt="Zeus" fill className="object-cover object-[center_18%]" sizes="48px" />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Essaie Zeus maintenant</p>
          <p className="text-[11px] leading-tight text-slate-500 sm:text-xs">Aucune inscription · Décris un chantier, tu as ton devis</p>
        </div>
      </div>

      {phase === "preview" && result ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Voilà ton devis. Vérifie les prix avant d&apos;envoyer.
            </p>
            <p className="mt-1 text-xs text-slate-500">Clique sur une ligne pour la corriger.</p>
            {result.reason ? (
              <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">{result.reason}</p>
            ) : null}
          </div>
          <DemoQuotePreview
            lines={result.lines}
            transcript={result.transcriptCorrige}
            tvaRate={result.tvaRate}
            onChange={(lines) => setResult((current) => (current ? { ...current, lines } : current))}
            onLineCommit={(index, field, previous, next) => {
              if (result.validationPassed) {
                trackFunnelEvent("demo_line_edited_after_success", {
                  properties: { line_index: index, field, old_value: previous, new_value: next, source: "demo" },
                });
                return;
              }
              if (editedLinesRef.current.has(index)) return;
              editedLinesRef.current.add(index);
              trackFunnelEvent("demo_line_edited", { properties: { line_index: index, field, source: "demo" } });
            }}
          />
          <Link
            href="/register?from=demo"
            data-cta-location={result.validationPassed ? "demo_preview" : "demo_confirmation"}
            aria-disabled={!demoPricesComplete(result.lines)}
            tabIndex={demoPricesComplete(result.lines) ? 0 : -1}
            onClick={(event) => {
              if (!demoPricesComplete(result.lines)) {
                event.preventDefault();
                return;
              }
              trackFunnelEvent("demo_cta_signup_click", {
                properties: { from: result.validationPassed ? "hero_preview" : "demo_confirmation" },
              });
            }}
            className={cx(
              focusRing,
              "inline-flex min-h-12 w-full flex-col items-center justify-center rounded-xl bg-[color:var(--primary)] px-6 py-2.5 text-white sm:min-h-11",
              !demoPricesComplete(result.lines) && "pointer-events-none opacity-40",
            )}
          >
            <span className="text-sm font-semibold">Envoyer le devis au client</span>
            <span className="text-xs font-medium text-white/85">Créer un compte</span>
          </Link>
        </div>
      ) : phase === "rate_limited" ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{rateLimitMessage}</p>
          <Link
            href="/register?from=demo"
            data-cta-location="demo_rate_limited"
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
            <div className="flex flex-col gap-2 sm:gap-3">
              {phase === "recording" ? (
                <>
                  <p className="text-center text-sm font-medium text-red-600">{formatSeconds(elapsedMs)} / 1:00</p>
                  <button
                    type="button"
                    onClick={() => void finishRecording()}
                    className={cx(
                      focusRing,
                      "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-base font-semibold text-white",
                    )}
                  >
                    <Square className="h-5 w-5 fill-current" />
                    Terminer
                  </button>
                </>
              ) : !ready ? (
                <div className="min-h-12 sm:min-h-14" aria-hidden />
              ) : inApp ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="hero-demo-text" className="sr-only">
                      Décris ton chantier
                    </label>
                    <textarea
                      id="hero-demo-text"
                      value={textFallback}
                      onChange={(e) => setTextFallback(e.target.value)}
                      rows={3}
                      placeholder="Décris ton chantier — ex. : remplacement chauffe-eau 200L, 4h MO…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => void onTextSubmit()}
                      className={cx(
                        focusRing,
                        "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 text-[15px] font-semibold text-white shadow-md sm:min-h-14 sm:text-base",
                      )}
                    >
                      Générer mon aperçu
                    </button>
                  </div>
                  <button
                    id="hero-demo-mic"
                    type="button"
                    onClick={() => void startRecording()}
                    className={cx(
                      focusRing,
                      "inline-flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Dicter à la voix
                    </span>
                    <span className="text-[11px] font-normal text-slate-500">(nécessite Safari ou Chrome)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="hero-demo-mic"
                    type="button"
                    onClick={() => void startRecording()}
                    className={cx(
                      focusRing,
                      "inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[color:var(--primary)] px-4 text-[15px] font-semibold text-white shadow-md sm:min-h-14 sm:gap-3 sm:px-6 sm:text-base",
                    )}
                  >
                    <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
                    Appuie et décris ton chantier
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowText((v) => !v)}
                    className="inline-flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    <Type className="h-3.5 w-3.5" />
                    {showText ? "Masquer le texte" : "Ou écris ton chantier"}
                  </button>

                  {showText ? (
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
                  ) : null}
                </>
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
