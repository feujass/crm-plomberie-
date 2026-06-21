"use client";

import type { AssistantSettingsPayload } from "@/types/assistant-settings";
import {
  FLOWO_CARD_HERO_GRADIENT_CLASS,
  FLOWO_CARD_HERO_SURFACE_CLASS,
  FLOWO_LIST_CARD_CLASS,
  FLOWO_SEARCH_INPUT_CLASS,
  flowoSegmentTabClass,
} from "@/lib/flowo-ui";
import type { BackendMeResponse } from "@/types/backend";
import { cx, focusRing } from "@/lib/utils";
import { Info } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_ASSISTANT = "Zeus";

const TVA_OPTIONS = [
  { value: "2.1", label: "2,1 %" },
  { value: "5.5", label: "5,5 %" },
  { value: "10", label: "10 %" },
  { value: "20", label: "20 %" },
];

const PAYS_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "BE", label: "Belgique", flag: "🇧🇪" },
  { code: "CH", label: "Suisse", flag: "🇨🇭" },
  { code: "LU", label: "Luxembourg", flag: "🇱🇺" },
  { code: "DE", label: "Allemagne", flag: "🇩🇪" },
  { code: "ES", label: "Espagne", flag: "🇪🇸" },
];

const STRUCTURE_OPTIONS: { value: string; label: string }[] = [
  { value: "libre", label: "Selon le devis" },
  { value: "piece", label: "Toujours par pièce" },
  { value: "type_travaux", label: "Toujours par corps d’état" },
];

const INFO_HINT =
  "Personnalisez le comportement de l’assistant sur vos devis, la TVA et la structure des lignes. Les changements sont enregistrés automatiquement.";

type Msg = { role: "user" | "assistant"; content: string };

const fieldClass =
  "w-full rounded-2xl border border-slate-200/55 bg-white py-3 px-4 text-sm text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 focus:border-[color:var(--primary)]/40 focus:ring-1 focus:ring-[color:var(--primary)]/15 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500";

function normalizeTva(v: number | undefined): string {
  const n = v ?? 10;
  const m = TVA_OPTIONS.find((o) => Math.abs(parseFloat(o.value) - n) < 0.01);
  return m ? m.value : "10";
}

function snapshot(
  prenom: string,
  nom: string,
  tva: string,
  pays: string,
  sep: boolean,
  library: boolean,
  structure: string,
  assistantName: string
) {
  return JSON.stringify({ prenom, nom, tva, pays, sep, library, structure, assistantName });
}

export function AssistantPageClient({ initialMe }: { initialMe: BackendMeResponse }) {
  const p = initialMe.profile ?? {};
  const [prenom, setPrenom] = useState(initialMe.prenom ?? "");
  const [nom, setNom] = useState(initialMe.nom ?? "");
  const [tva, setTva] = useState(normalizeTva(p.tva_defaut));
  const [pays, setPays] = useState(p.pays ?? "FR");
  const [sep, setSep] = useState(Boolean(p.sep_fourniture_pose));
  const [library, setLibrary] = useState(() => (p.use_personal_library === false ? false : true));
  const [structure, setStructure] = useState(p.structure_devis ?? "libre");
  const [assistantName, setAssistantName] = useState((p.assistant_name as string | undefined)?.trim() || DEFAULT_ASSISTANT);

  const [view, setView] = useState<"reglages" | "discuter">("reglages");

  const [baseline, setBaseline] = useState(() =>
    snapshot(
      initialMe.prenom ?? "",
      initialMe.nom ?? "",
      normalizeTva(p.tva_defaut),
      p.pays ?? "FR",
      Boolean(p.sep_fourniture_pose),
      p.use_personal_library === false ? false : true,
      p.structure_devis ?? "libre",
      (p.assistant_name as string | undefined)?.trim() || DEFAULT_ASSISTANT
    )
  );

  const [autoSave, setAutoSave] = useState<"synced" | "saving" | "error">("synced");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tvaOpen, setTvaOpen] = useState(false);
  const [paysOpen, setPaysOpen] = useState(false);
  const pauseAutoSave = useRef(false);

  const currentSnap = useMemo(
    () => snapshot(prenom, nom, tva, pays, sep, library, structure, assistantName),
    [prenom, nom, tva, pays, sep, library, structure, assistantName]
  );
  const isDirty = currentSnap !== baseline;

  useEffect(() => {
    pauseAutoSave.current = false;
  }, [currentSnap]);

  const save = useCallback(async () => {
    const tvaNum = parseFloat(tva.replace(",", "."));
    const payload: AssistantSettingsPayload = {
      prenom,
      nom,
      tva_defaut: Number.isFinite(tvaNum) ? tvaNum : 10,
      pays,
      sep_fourniture_pose: sep,
      use_personal_library: library,
      structure_devis: structure,
      assistant_name: assistantName.trim() || DEFAULT_ASSISTANT,
    };
    const http = await fetch("/api/profile/assistant-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    let body: unknown;
    try {
      body = await http.json();
    } catch {
      setAutoSave("error");
      pauseAutoSave.current = true;
      return;
    }
    const out = body as { ok?: boolean; me?: BackendMeResponse };
    if (!out.ok || !out.me) {
      setAutoSave("error");
      pauseAutoSave.current = true;
      return;
    }
    const me = out.me;
    setBaseline(
      snapshot(
        me.prenom ?? "",
        me.nom ?? "",
        normalizeTva(me.profile?.tva_defaut),
        me.profile?.pays ?? "FR",
        Boolean(me.profile?.sep_fourniture_pose),
        me.profile?.use_personal_library === false ? false : true,
        me.profile?.structure_devis ?? "libre",
        (me.profile?.assistant_name as string | undefined)?.trim() || DEFAULT_ASSISTANT
      )
    );
    setPrenom(me.prenom ?? "");
    setNom(me.nom ?? "");
    setTva(normalizeTva(me.profile?.tva_defaut));
    setPays(me.profile?.pays ?? "FR");
    setSep(Boolean(me.profile?.sep_fourniture_pose));
    {
      const lib = me.profile?.use_personal_library;
      setLibrary(lib === false ? false : true);
    }
    setStructure(me.profile?.structure_devis ?? "libre");
    setAssistantName((me.profile?.assistant_name as string | undefined)?.trim() || DEFAULT_ASSISTANT);
    setAutoSave("synced");
  }, [prenom, nom, tva, pays, sep, library, structure, assistantName]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isDirty) {
      setAutoSave("synced");
      return;
    }
    if (pauseAutoSave.current) {
      return;
    }
    setAutoSave("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isDirty, save]);

  const displayName = assistantName.trim() || DEFAULT_ASSISTANT;

  const summaryLine = useMemo(() => {
    const call = prenom.trim() || "…";
    const t = TVA_OPTIONS.find((o) => o.value === tva)?.label ?? `${tva} %`;
    const struct = STRUCTURE_OPTIONS.find((o) => o.value === structure)?.label ?? "—";
    const pay = PAYS_OPTIONS.find((c) => c.code === pays)?.label ?? pays;
    return `${displayName} vous appelle ${call}. TVA par défaut ${t}, pays ${pay}. Lignes de devis : ${struct}. ${
      sep ? "Fourniture et pose séparées" : "Fourniture et pose regroupées"
    }. ${library ? "Bibliothèque personnelle activée" : "Bibliothèque personnelle désactivée"}.`;
  }, [displayName, prenom, tva, pays, structure, sep, library]);

  async function sendChat() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch("/api/assistant/flowo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = (await res.json()) as { content?: string; message?: string };
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: json.message ?? "Erreur" }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: json.content ?? "" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur réseau." }]);
    }
    setSending(false);
  }

  const tvaLabel = TVA_OPTIONS.find((o) => o.value === tva)?.label ?? `${tva} %`;
  const paysOpt = PAYS_OPTIONS.find((c) => c.code === pays) ?? PAYS_OPTIONS[0]!;

  const listSheetClass =
    "relative z-10 w-full max-w-lg rounded-t-2xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl";

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--primary)] dark:text-[color:var(--chart-1)]">Assistant</h1>
          <span className="inline-flex text-slate-400 dark:text-slate-500" title={INFO_HINT} aria-label={INFO_HINT}>
            <Info className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Ajustez les réglages (identité, TVA, structure des devis, bibliothèque) puis discutez avec l’assistant pour des réponses
          adaptées à votre métier du BTP et à vos devis.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setView("reglages")} className={cx(focusRing, flowoSegmentTabClass(view === "reglages"))}>
          Réglages
        </button>
        <button type="button" onClick={() => setView("discuter")} className={cx(focusRing, flowoSegmentTabClass(view === "discuter"))}>
          Discuter
        </button>
      </div>

      {view === "reglages" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Personnalisation</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">Personnalisez {displayName} pour qu’il travaille comme vous</h2>

            <div className="mt-4 rounded-2xl border border-slate-200/60 bg-slate-50/90 p-4 dark:border-slate-600/50 dark:bg-slate-800/40">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Résumé des réglages</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{summaryLine}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--primary)]/20 bg-white px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-[color:var(--primary)] dark:bg-slate-900/80 dark:text-[color:var(--chart-1)]">
                {autoSave === "saving" ? <span className="size-2.5 animate-pulse rounded-full bg-[color:var(--primary)]" /> : "✓"}
                <span>
                  {autoSave === "error" ? "ERREUR D’ENREGISTREMENT" : autoSave === "saving" ? "Enregistrement…" : "Enregistré ✓"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Comment {displayName} doit-il vous appeler ?</label>
              <p className="text-sm text-slate-500 dark:text-slate-400">Prénom ou nom d’usage pour vous saluer sur les devis et dans le chat.</p>
              <input className={fieldClass} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex. Julien" />
            </div>
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Nom (facultatif)</label>
              <p className="text-sm text-slate-500 dark:text-slate-400">Synchronisé avec votre compte — utilisé sur les documents si renseigné.</p>
              <input className={fieldClass} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Martin" />
            </div>

            <div className="mt-5 space-y-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Quelle est votre TVA par défaut ?</label>
              <p className="text-sm text-slate-500 dark:text-slate-400">Taux appliqué par défaut aux nouvelles lignes (France).</p>
              <button
                type="button"
                onClick={() => setTvaOpen(true)}
                className={cx(
                  "flex w-full items-center gap-2 rounded-2xl border border-slate-200/55 bg-white py-3 pl-4 pr-3 text-left text-sm dark:border-slate-600 dark:bg-slate-800/90",
                  focusRing,
                )}
              >
                <span className="text-xl">🇫🇷</span>
                <span className="flex-1 font-semibold text-slate-900 dark:text-slate-100">{tvaLabel}</span>
                <span className="text-slate-400">▾</span>
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Pays</label>
              <p className="text-sm text-slate-500 dark:text-slate-400">Cohérence d’affichage sur les devis.</p>
              <button
                type="button"
                onClick={() => setPaysOpen(true)}
                className={cx(
                  "flex w-full items-center gap-2 rounded-2xl border border-slate-200/55 bg-white py-3 pl-4 pr-3 text-left text-sm dark:border-slate-600 dark:bg-slate-800/90",
                  focusRing,
                )}
              >
                <span className="text-xl">{paysOpt.flag}</span>
                <span className="flex-1 font-semibold text-slate-900 dark:text-slate-100">{paysOpt.label}</span>
                <span className="text-slate-400">▾</span>
              </button>
            </div>

            <ToggleBlock label="Séparer fourniture et pose" sub="Deux lignes distinctes sur les devis lorsque c’est pertinent." value={sep} onChange={setSep} />
            <ToggleBlock label="Bibliothèque personnelle" sub="Suggère vos ouvrages enregistrés lors de la rédaction." value={library} onChange={setLibrary} />

            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Comment structurer les lignes du devis ?</p>
              <div className="space-y-2">
                {STRUCTURE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setStructure(o.value)}
                    className={cx(
                      "w-full rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition",
                      focusRing,
                      structure === o.value
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-sm"
                        : "border-slate-200/90 bg-white text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300/90 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/80",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className={cx(FLOWO_LIST_CARD_CLASS, "overflow-hidden")}>
            <div className={cx("relative h-48 overflow-hidden sm:h-52", FLOWO_CARD_HERO_SURFACE_CLASS)}>
              <Image
                src="/zeus-avatar.png"
                alt="Zeus, assistant IA Flowo"
                fill
                className="object-cover object-[center_18%]"
                sizes="(max-width: 1024px) 100vw, 42rem"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" aria-hidden />
              <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:bg-slate-950/90 dark:text-slate-100">
                Assistant IA
              </div>
            </div>
            <div className="space-y-1 px-4 pb-2 pt-4 sm:px-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{displayName}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Posez des questions sur les devis, l’ouvrage et le métier.</p>
              <button
                type="button"
                onClick={() => setView("discuter")}
                className={cx(
                  "mt-3 w-full rounded-full bg-[color:var(--primary)] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95",
                  focusRing,
                )}
              >
                Discuter avec {displayName}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <section className={cx(FLOWO_LIST_CARD_CLASS, "flex min-h-[min(70vh,560px)] flex-col overflow-hidden")}>
          <div className={cx("relative h-40 shrink-0 overflow-hidden", FLOWO_CARD_HERO_SURFACE_CLASS)}>
            <div className={cx("absolute inset-0", FLOWO_CARD_HERO_GRADIENT_CLASS)} aria-hidden />
            <div className="absolute inset-0 flex items-end gap-3 p-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/30 shadow-md">
                <Image src="/zeus-avatar.png" alt="" fill className="object-cover object-[center_18%]" sizes="80px" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{displayName}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">En ligne</p>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/90 px-4 py-8 text-center text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                Écrivez un message pour commencer. Idées : structure d’un devis, formulation client, taux de TVA, bonnes pratiques.
              </p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cx(
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-[color:var(--primary)] text-white"
                    : "border border-slate-200/80 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-200/75 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/80">
            <input
              className={cx(FLOWO_SEARCH_INPUT_CLASS, "py-2.5 pl-4")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void sendChat())}
              placeholder="Votre message…"
            />
            <button
              type="button"
              onClick={() => void sendChat()}
              disabled={sending}
              className={cx(
                "shrink-0 rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50",
                focusRing,
              )}
            >
              {sending ? "…" : "Envoyer"}
            </button>
          </div>
        </section>
      )}

      {tvaOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={() => setTvaOpen(false)} />
          <div className={listSheetClass} onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-base font-bold text-slate-900 dark:text-slate-50">TVA par défaut</p>
            <div className="max-h-[50vh] overflow-y-auto">
              {TVA_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setTva(o.value);
                    setTvaOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition",
                    focusRing,
                    tva === o.value
                      ? "bg-[color:var(--primary)]/12 text-[color:var(--primary)] dark:text-[color:var(--chart-1)]"
                      : "text-slate-800 dark:text-slate-200",
                  )}
                >
                  <span>🇫🇷</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {paysOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={() => setPaysOpen(false)} />
          <div className={listSheetClass} onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-base font-bold text-slate-900 dark:text-slate-50">Pays</p>
            <div className="max-h-[50vh] overflow-y-auto">
              {PAYS_OPTIONS.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  onClick={() => {
                    setPays(o.code);
                    setPaysOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition",
                    focusRing,
                    pays === o.code
                      ? "bg-[color:var(--primary)]/12 text-[color:var(--primary)] dark:text-[color:var(--chart-1)]"
                      : "text-slate-800 dark:text-slate-200",
                  )}
                >
                  <span className="text-xl">{o.flag}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Interrupteur compact type Renalto / iOS : ~51×28 px, rond ~22 px. Non / piste / Oui = trois boutons (clic « Oui » explicite). */
function ToggleBlock({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
      <div className="relative z-20 mt-3 flex flex-nowrap items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cx(
            focusRing,
            "min-h-[44px] min-w-[44px] shrink-0 rounded-lg px-2 text-sm font-semibold transition-colors",
            !value ? "text-[color:var(--primary)]" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400",
          )}
        >
          Non
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={value ? "Désactiver" : "Activer"}
          onClick={() => onChange(!value)}
          className={cx(
            focusRing,
            "relative z-20 h-[28px] w-[51px] shrink-0 touch-manipulation overflow-hidden rounded-full transition-colors duration-150 ease-out",
            value ? "bg-[color:var(--primary)]" : "bg-slate-300 dark:bg-slate-600",
          )}
        >
          <span
            className={cx(
              "pointer-events-none absolute top-1/2 size-[22px] -translate-y-1/2 rounded-full bg-white shadow ring-1 ring-black/10 transition-[left] duration-150 ease-out dark:ring-white/15",
              value ? "left-[26px]" : "left-[3px]",
            )}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cx(
            focusRing,
            "min-h-[44px] min-w-[44px] shrink-0 rounded-lg px-2 text-sm font-semibold transition-colors",
            value ? "text-[color:var(--primary)]" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400",
          )}
        >
          Oui
        </button>
      </div>
    </div>
  );
}
