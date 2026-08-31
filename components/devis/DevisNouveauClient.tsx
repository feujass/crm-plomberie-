"use client";

import { Button } from "@/components/ui/Button";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { Input } from "@/components/ui/Input";
import {
  hasSkippedVoiceProfilePrompt,
  ProfileVoicePromptModal,
} from "@/components/profile/ProfileVoicePromptModal";
import { flowoSegmentTabClass } from "@/lib/flowo-ui";
import { computeProfileCompletion } from "@/lib/profile/completion";
import type { BackendClient, BackendMeResponse } from "@/types/backend";
import type { DevisLigneInput } from "@/types/devis";
import { cx, focusRing } from "@/lib/utils";
import { BookMarked, Euro, KeyRound, Mic, Play, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientFromIa } from "@/lib/devis/resolve-ia-client";
import type { DevisIaClient } from "@/lib/schemas/devis-ia";
import { listenForSpeech } from "@/lib/voice/browserSpeechRecognition";

const ASSISTANT_NAME = "Zeus";
const ZEUS_AVATAR_SRC = "/zeus-avatar.png";

function ZeusAvatar({ className }: { className?: string }) {
  return (
    <Image
      src={ZEUS_AVATAR_SRC}
      alt={`${ASSISTANT_NAME}, assistant pour vos devis`}
      width={512}
      height={512}
      className={cx("h-full w-full rounded-full object-cover object-[center_18%]", className)}
      sizes="(max-width: 1024px) 168px, 200px"
      priority
    />
  );
}

const MAX_MESSAGE_CHARS = 1200;

async function parseJsonSafely<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Réponse serveur invalide (pas de JSON)");
  }
}

type InputTab = "write" | "voice";

const TAB_LABEL: Record<InputTab, string> = {
  voice: "Voix",
  write: "Texte",
};

/** Voix en premier — mode par défaut à l’ouverture. */
const INPUT_TABS: InputTab[] = ["voice", "write"];

export function DevisNouveauClient({
  clients,
  initialClientId = "",
  me,
}: {
  clients: BackendClient[];
  initialClientId?: string;
  me: BackendMeResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<InputTab>("voice");
  const [showClientFields, setShowClientFields] = useState(false);
  const [clientId, setClientId] = useState(initialClientId);
  const [clientEmail, setClientEmail] = useState("");
  const [clientPrenom, setClientPrenom] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [lastAutoEmail, setLastAutoEmail] = useState("");
  const [text, setText] = useState("");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording">("idle");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const speechRef = useRef<{ stop: () => void } | null>(null);

  const profileComplete = useMemo(
    () => profileSaved || computeProfileCompletion(me).basicComplete,
    [me, profileSaved],
  );

  const voicePromptSkipped =
    hasSkippedVoiceProfilePrompt() || Boolean(me.profile?.profile_voice_prompt_skipped_at);

  function shouldPromptVoiceProfile() {
    return !profileComplete && !voicePromptSkipped;
  }

  useEffect(() => {
    if (tab !== "voice") return;
    if (profileComplete || voicePromptSkipped) return;
    setVoiceModalOpen(true);
  }, [tab, profileComplete, voicePromptSkipped]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "file") {
      router.replace("/devis/import");
      return;
    }
    if (t === "voice") setTab("voice");
    else if (t === "write") setTab("write");
  }, [searchParams, router]);

  useEffect(() => {
    if (initialClientId || clientId) setShowClientFields(true);
  }, [initialClientId, clientId]);

  useEffect(() => {
    const nextEmail = (selectedClient?.email ?? "").trim();
    if (!nextEmail) return;
    setClientEmail((prev) => {
      const p = prev.trim();
      if (!p) {
        setLastAutoEmail(nextEmail);
        return nextEmail;
      }
      if (p === lastAutoEmail) {
        setLastAutoEmail(nextEmail);
        return nextEmail;
      }
      return prev;
    });
  }, [selectedClient?.email, lastAutoEmail]);

  async function runGenerate(body: { text: string }) {
    setErr(null);
    try {
      const res = await fetch("/api/devis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body.text }),
      });
      const json = await parseJsonSafely<{
        message?: string;
        lignes?: DevisLigneInput[];
        adresse_chantier?: string | null;
        client?: DevisIaClient;
        notes?: string | null;
        date_expiration?: string | null;
      }>(res);
      if (!res.ok) {
        const msg = json.message || "Génération impossible";
        if (msg.toLowerCase().includes("anthropic_api_key") || msg.toLowerCase().includes("ia non configurée")) {
          const cre = await fetch("/api/devis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ mode: "draft", client_id: clientId || null }),
          });
          const created = await parseJsonSafely<{ id?: string; message?: string }>(cre);
          if (!cre.ok) throw new Error(created.message || "Création du devis");
          if (!created.id) throw new Error("Réponse serveur invalide");
          window.location.assign(`/devis/${encodeURIComponent(created.id)}?info=no-ai`);
          return;
        }
        throw new Error(msg);
      }

      const resolvedClientId = await createClientFromIa({
        existingClientId: clientId || null,
        manualNom: clientNom,
        manualPrenom: clientPrenom,
        manualEmail: clientEmail,
        iaClient: json.client,
      });
      if (resolvedClientId) setClientId(resolvedClientId);

      const cre = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mode: "from_ia",
          client_id: resolvedClientId,
          adresse_chantier: json.adresse_chantier?.trim() || null,
          notes: json.notes?.trim() || null,
          date_expiration: json.date_expiration || null,
          lignes: json.lignes ?? [],
        }),
      });
      const created = await parseJsonSafely<{ id?: string; message?: string }>(cre);
      if (!cre.ok) throw new Error(created.message || "Création du devis");
      if (!created.id) throw new Error("Réponse serveur invalide");
      window.location.assign(`/devis/${encodeURIComponent(created.id)}?view=preview`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function onVoice() {
    if (shouldPromptVoiceProfile()) {
      setVoiceModalOpen(true);
      return;
    }

    if (recState === "recording" && speechRef.current) {
      speechRef.current.stop();
      return;
    }

    setErr(null);
    const { stop, promise } = listenForSpeech({ lang: "fr-FR" });
    speechRef.current = { stop };
    setRecState("recording");

    try {
      const transcript = await promise;
      speechRef.current = null;
      setRecState("idle");
      start(async () => {
        await runGenerate({ text: transcript });
      });
    } catch (e) {
      speechRef.current = null;
      setRecState("idle");
      setErr(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="max-w-full space-y-5 pb-4 md:space-y-8">
      <header>
        <CircleBackLink href="/devis" label="Retour aux devis" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">
          Nouveau devis
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Parlez pour créer le devis en quelques secondes — ou passez en mode texte si besoin.{" "}
          <Link href="/devis/import" className="font-medium text-[color:var(--primary)] hover:underline">
            Importer un ancien devis (PDF, CSV)
          </Link>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
        <section className="min-w-0 max-w-full rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900 md:p-6">
          <div className="flex flex-wrap gap-2">
            {INPUT_TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cx(focusRing, flowoSegmentTabClass(tab === id, { compact: true }))}
              >
                {id === "voice" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Mic className="size-3.5 shrink-0" aria-hidden />
                    {TAB_LABEL[id]}
                  </span>
                ) : (
                  TAB_LABEL[id]
                )}
              </button>
            ))}
          </div>

          {err ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          ) : null}

          <div className="mt-5">
            {tab === "voice" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--primary)]/15 bg-[color:var(--primary)]/[0.04] px-4 py-3 dark:border-[color:var(--primary)]/25 dark:bg-[color:var(--primary)]/10">
                  <p className="text-sm font-medium text-[color:var(--primary)]">Mode recommandé</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                    Chrome recommandé. Cliquez, décrivez le chantier (10–30 s), puis « Arrêter et créer le devis ».
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void onVoice()}
                  disabled={busy && recState !== "recording"}
                  isLoading={busy && recState !== "recording"}
                  loadingText="Génération du devis…"
                  className={cx(
                    "h-14 w-full rounded-full !border-transparent !bg-[color:var(--primary)] text-base font-semibold !text-white shadow-md hover:opacity-95",
                    recState === "recording" && "animate-pulse !bg-red-600 hover:!bg-red-700",
                  )}
                >
                  <Mic className="mr-2 size-5" aria-hidden />
                  {recState === "recording" ? "Arrêter et créer le devis" : "Parler et créer le devis"}
                </Button>
              </div>
            ) : null}

            {tab === "write" ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = text.trim();
                  if (!t) {
                    setErr("Décrivez les travaux.");
                    return;
                  }
                  if (t.length > MAX_MESSAGE_CHARS) {
                    setErr(`Message trop long (max. ${MAX_MESSAGE_CHARS} caractères).`);
                    return;
                  }
                  start(() => runGenerate({ text: t }));
                }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                  rows={6}
                  maxLength={MAX_MESSAGE_CHARS}
                  placeholder="Ex. rénovation SDB 6 m², dépose carrelage, robinetterie…"
                  className={cx(
                    "w-full rounded-2xl border border-slate-200/55 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400",
                    "focus:border-[color:var(--primary)]/35 focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]/12",
                    "dark:border-slate-600 dark:bg-slate-800/88 dark:text-slate-100 dark:placeholder:text-slate-500",
                  )}
                />
                <Button
                  type="submit"
                  disabled={busy}
                  isLoading={busy}
                  loadingText="Génération…"
                  className="h-12 w-full rounded-full !border-transparent !bg-[color:var(--primary)] text-sm font-semibold !text-white shadow-sm hover:opacity-95"
                >
                  <Play className="mr-2 size-4 shrink-0 fill-current" aria-hidden />
                  Créer le devis
                </Button>
              </form>
            ) : null}

          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowClientFields((v) => !v)}
              className="text-sm font-medium text-[color:var(--primary)] hover:underline"
            >
              {showClientFields ? "Masquer le client" : "Lier un client"}
            </button>

            {showClientFields ? (
              <div className="mt-3 space-y-3">
                <select
                  className="w-full rounded-2xl border border-slate-200/55 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[color:var(--primary)]/35 focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]/12 dark:border-slate-600 dark:bg-slate-800/88 dark:text-slate-100"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">— Choisir un client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="E-mail" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                  <Input label="Prénom" value={clientPrenom} onChange={(e) => setClientPrenom(e.target.value)} />
                  <Input label="Nom" value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
                </div>
              </div>
          ) : null}
        </div>
      </section>

        <aside
          className={cx(
            "min-w-0 max-w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] lg:sticky lg:top-4",
            "dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
          )}
        >
          <div
            className={cx(
              "relative mx-auto mb-4 aspect-square w-full max-w-[11rem] overflow-hidden rounded-full",
              "ring-1 ring-[var(--border)] shadow-[0_8px_28px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.35)]",
            )}
          >
            <ZeusAvatar className="relative z-[1] select-none" />
            <span
              className="absolute bottom-2 right-2 z-[2] size-3 rounded-full bg-emerald-500 ring-2 ring-[var(--card)]"
              title="Prêt"
              aria-hidden
            />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[color:var(--primary)]">{ASSISTANT_NAME}</p>
            <p className="mt-2 text-pretty text-xs leading-relaxed text-[var(--muted-foreground)]">
              {ASSISTANT_NAME} écoute votre description vocale et structure le devis — ou basculez en mode texte.
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">En ligne</p>
          </div>

          <div className="mt-6 rounded-xl bg-[var(--accent)]/50 p-4 dark:bg-zinc-900/80">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--primary)]">Avec {ASSISTANT_NAME}</p>
            <ul className="space-y-3 text-sm text-[var(--foreground)]">
              <li className="flex gap-2">
                <Zap className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                <span>Devis structuré rapidement à partir de ta description</span>
              </li>
              <li className="flex gap-2">
                <BookMarked className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                <span>
                  PDF ou CSV d&apos;un ancien devis →{" "}
                  <Link href="/devis/import" className="font-medium text-[color:var(--primary)] hover:underline">
                    page Importer
                  </Link>
                </span>
              </li>
              <li className="flex gap-2">
                <Euro className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                <span>
                  Tarifs issus de ton{" "}
                  <Link href="/catalogue?type=fourniture" className="font-medium text-[color:var(--primary)] hover:underline">
                    catalogue fournitures
                  </Link>{" "}
                  et ouvrages
                </span>
              </li>
              <li className="flex gap-2">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                <span>Paramètres TVA et structure adaptés à ton profil</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <ProfileVoicePromptModal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        defaults={{
          prenom: me.prenom,
          nom: me.nom,
          tel: me.profile?.tel,
          entreprise: me.profile?.entreprise,
          metier: me.profile?.metier,
        }}
        onSaved={() => setProfileSaved(true)}
      />
    </div>
  );
}
