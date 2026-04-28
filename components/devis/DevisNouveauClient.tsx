"use client";

import { createDevisFromIaAction, createDraftDevis } from "@/app/actions/devis";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { BackendClient } from "@/types/backend";
import type { DevisLigneInput } from "@/app/actions/devis";
import { cx } from "@/lib/utils";
import { BookMarked, Euro, FileUp, KeyRound, Mic, Play, Sparkles, Zap } from "lucide-react";
import Image from "next/image";
import { useState, useTransition, type ReactNode } from "react";

/** Persona affichée dans l’interface. */
const ASSISTANT_NAME = "Zeus";

/** Avatar officiel (fichier dans /public). Remplacez `public/zeus-avatar.png` pour changer l’image. */
const ZEUS_AVATAR_SRC = "/zeus-avatar.png";

function ZeusAvatar({ className }: { className?: string }) {
  return (
    <Image
      src={ZEUS_AVATAR_SRC}
      alt={`${ASSISTANT_NAME}, assistant IA — ours brun, casquette à l’envers`}
      width={512}
      height={512}
      className={cx("h-full w-full rounded-full object-cover object-[center_18%]", className)}
      sizes="(max-width: 1024px) 168px, 200px"
      priority
    />
  );
}

const MAX_MESSAGE_CHARS = 1200;

const VISIBLE_CATEGORY_COUNT = 4;

const CATEGORY_PRESETS: { label: string; snippet: string }[] = [
  {
    label: "Salle de bain",
    snippet:
      "Devis pour rénovation d’une salle de bain d’environ 6 m² : dépose carrelage et ancienne faïence, préparation des supports, pose faïence murale et sol, robinetterie (lavabo + douche), évacuations et raccordements, petites adaptations électriques (spots, VMC). Préciser les finitions souhaitées.",
  },
  {
    label: "Cuisine",
    snippet:
      "Installation / rénovation cuisine : arrivées eau froide et chaude, évacuation lave-vaisselle et évier, mise à niveau des points électriques (four, plaques, prises dédiées), éventuel percement et raccordements. Indiquer linéaire et équipements fournis par le client ou à fournir.",
  },
  {
    label: "Plomberie",
    snippet:
      "Intervention plomberie : recherche de fuite / remplacement de pièces (détailler accès), désembouage ou remplacement de radiateurs, création ou déplacement de sorties d’eau. Préciser étages, accès vide sanitaire et contraintes horaires.",
  },
  {
    label: "Chauffage",
    snippet:
      "Mise aux normes ou entretien chauffage : remplacement circulateur, purge circuit, équilibrage, ou remplacement ballon / groupe sécurité. Indiquer type d’énergie (gaz / électrique / PAC) et marque du matériel si connu.",
  },
  {
    label: "Dépannage",
    snippet:
      "Dépannage urgent : symptôme (fuite visible, absence d’eau chaude, WC bloqué…), localisation dans le logement, accès et créneaux possibles. Préciser si eau coupée ou non.",
  },
  {
    label: "Rénovation",
    snippet:
      "Rénovation d’ensemble (plusieurs corps d’état liés à l’eau) : périmètre des pièces, état des réseaux existants, objectifs (mise aux normes, confort, esthétique). Ajouter délais souhaités et contraintes chantier.",
  },
  {
    label: "Neuf / extension",
    snippet:
      "Chantier neuf ou extension : plans ou surfaces, nombre de sanitaires, distribution des réseaux (per, multicouche…), attentes normatives et coordination avec d’autres lots.",
  },
  {
    label: "Toiture / extérieur",
    snippet:
      "Travaux extérieurs liés à l’eau : évacuations gouttières, raccordements cuve / pompe de relevage, extérieur sanitaire. Préciser hauteur et accès.",
  },
];

type InputTab = "write" | "voice" | "file";

export function DevisNouveauClient({ clients, initialClientId = "" }: { clients: BackendClient[]; initialClientId?: string }) {
  const [tab, setTab] = useState<InputTab>("write");
  const [clientId, setClientId] = useState(initialClientId);
  const [text, setText] = useState("");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording">("idle");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const visibleCategories = showAllCategories ? CATEGORY_PRESETS : CATEGORY_PRESETS.slice(0, VISIBLE_CATEGORY_COUNT);
  const hiddenCategoryCount = Math.max(0, CATEGORY_PRESETS.length - VISIBLE_CATEGORY_COUNT);

  function applyCategorySnippet(snippet: string) {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${snippet}` : snippet));
  }

  async function runGenerate(body: { text?: string; file?: File }) {
    setErr(null);
    try {
      let lignes: DevisLigneInput[] = [];
      if (body.file) {
        const fd = new FormData();
        fd.append("file", body.file);
        const res = await fetch("/api/devis/vision", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Vision");
        lignes = json.lignes;
      } else if (body.text) {
        const res = await fetch("/api/devis/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: body.text }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Génération");
        lignes = json.lignes;
      }
      await createDevisFromIaAction({
        client_id: clientId || null,
        lignes,
        notes: null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function onVoice() {
    if (recState === "recording" && rec) {
      rec.stop();
      setRecState("idle");
      return;
    }
    setErr(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    mr.ondataavailable = (ev) => chunks.push(ev.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("file", blob, "voice.webm");
      start(async () => {
        try {
          const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
          const json = await tr.json();
          if (!tr.ok) throw new Error(json.message || "Transcription");
          await runGenerate({ text: json.text as string });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Erreur");
        }
      });
    };
    mr.start();
    setRec(mr);
    setRecState("recording");
  }

  const tabDefs: { id: InputTab; label: string; icon: ReactNode }[] = [
    { id: "write", label: "Écrire un message", icon: <Sparkles className="size-4 opacity-70" aria-hidden /> },
    { id: "voice", label: "Enregistrer un message", icon: <Mic className="size-4 opacity-70" aria-hidden /> },
    { id: "file", label: "Importer un fichier", icon: <FileUp className="size-4 opacity-70" aria-hidden /> },
  ];

  return (
    <div className="max-w-full space-y-5 md:space-y-8">
      <header className="space-y-2 text-center lg:text-left">
        <h1 className="text-balance text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl md:text-3xl">
          Décris ton chantier et laisse{" "}
          <span className="text-[color:var(--primary)]">{ASSISTANT_NAME}</span> créer ton devis
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] md:text-base">
          Un texte détaillé donne un résultat plus précis. Tu pourras tout ajuster sur la fiche devis.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
        <section
          className={cx(
            "min-w-0 max-w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] md:p-7",
            "dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
          )}
        >
          {/* Mobile: chips en scroll horizontal (pas de débordement) */}
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap">
            {visibleCategories.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => applyCategorySnippet(c.snippet)}
                className={cx(
                  "touch-target shrink-0 rounded-full border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors sm:text-sm",
                  "hover:border-[color:var(--primary)]/40 hover:bg-[var(--accent)]/80",
                  "dark:bg-zinc-900/80 dark:hover:bg-zinc-800",
                )}
              >
                {c.label}
              </button>
            ))}
            {!showAllCategories && hiddenCategoryCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllCategories(true)}
                className="touch-target shrink-0 rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--primary)] hover:bg-[var(--accent)]/60 sm:text-sm"
              >
                + Afficher plus ({hiddenCategoryCount})
              </button>
            ) : null}
          </div>

          <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
            <span className="mb-1.5 block text-[var(--muted-foreground)]">Client (optionnel)</span>
            <select
              className={cx(
                "w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)]",
                "focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/25",
                "dark:bg-zinc-950",
              )}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Sans client lié —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                </option>
              ))}
            </select>
          </label>

          {err ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          ) : null}

          <div className="mt-6 border-b border-[var(--border)]">
            <div className="flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabDefs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cx(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "border-[color:var(--primary)] text-[color:var(--primary)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {tab === "write" ? (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = text.trim();
                  if (!t) {
                    setErr("Décris les travaux ou choisis un exemple ci-dessus.");
                    return;
                  }
                  if (t.length > MAX_MESSAGE_CHARS) {
                    setErr(`Message trop long (max. ${MAX_MESSAGE_CHARS} caractères).`);
                    return;
                  }
                  start(() => runGenerate({ text: t }));
                }}
              >
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">
                    <span className="font-medium text-[color:var(--primary)]">Choisis un exemple</span> (puces) ou écris ta propre demande.
                  </p>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                    rows={8}
                    maxLength={MAX_MESSAGE_CHARS}
                    placeholder="Ex. : rénovation salle de bain, surfaces, matériaux, contraintes d’accès, délais…"
                    className={cx(
                      "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
                      "min-h-[120px] md:min-h-[220px] md:resize-y focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/25",
                      "dark:bg-zinc-950",
                    )}
                  />
                  <div className="mt-1 flex justify-end text-xs text-[var(--muted-foreground)]">
                    {text.length}/{MAX_MESSAGE_CHARS}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  isLoading={busy}
                  loadingText="Génération…"
                  className="h-11 w-full rounded-xl !border-transparent !bg-[color:var(--primary)] text-sm font-semibold !text-white shadow-md hover:!bg-[#1e40af] sm:h-12 sm:text-base md:h-14"
                >
                  <Play className="mr-2 size-4.5 shrink-0 fill-current opacity-95 sm:size-5" aria-hidden />
                  Créer un devis
                </Button>
              </form>
            ) : null}

            {tab === "voice" ? (
              <div className="space-y-5">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Décris les travaux à voix haute. À l’arrêt, le message est transcrit puis transformé en lignes de devis.
                </p>
                <div className="flex flex-col items-start gap-3">
                  <Button
                    type="button"
                    onClick={() => void onVoice()}
                    disabled={busy}
                    isLoading={busy && recState !== "recording"}
                    className={cx(
                      "h-12 rounded-xl px-6 !border-transparent !bg-[color:var(--primary)] !text-white hover:!bg-[#1e40af]",
                      recState === "recording" && "animate-pulse !bg-red-600 hover:!bg-red-700",
                    )}
                  >
                    <Mic className="mr-2 size-5" aria-hidden />
                    {recState === "recording" ? "Arrêter et générer le devis" : "Enregistrer et générer"}
                  </Button>
                  {recState === "recording" ? (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Enregistrement en cours…</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "file" ? (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = (e.target as HTMLFormElement).elements.namedItem("file") as HTMLInputElement;
                  const file = f.files?.[0];
                  if (!file) {
                    setErr("Choisis une photo ou un PDF.");
                    return;
                  }
                  start(() => runGenerate({ file }));
                }}
              >
                <p className="text-sm text-[var(--muted-foreground)]">
                  Photo nette ou PDF : l’IA extrait les postes et quantités quand c’est lisible.
                </p>
                <Input
                  label="Fichier"
                  name="file"
                  type="file"
                  accept="image/*,application/pdf"
                  className="cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[color:var(--primary)]"
                  onChange={(e) => {
                    const n = e.target.files?.[0]?.name;
                    setFileLabel(n ?? null);
                  }}
                />
                {fileLabel ? <p className="text-xs text-[var(--muted-foreground)]">Sélection : {fileLabel}</p> : null}
                <Button
                  type="submit"
                  disabled={busy}
                  isLoading={busy}
                  loadingText="Analyse…"
                  className="h-12 w-full rounded-xl !border-transparent !bg-[color:var(--primary)] !text-white hover:!bg-[#1e40af]"
                >
                  <FileUp className="mr-2 size-5" aria-hidden />
                  Analyser et créer le devis
                </Button>
              </form>
            ) : null}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={() => start(() => createDraftDevis(clientId || null))}
            >
              Créer un brouillon vide à la place
            </Button>
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
              {ASSISTANT_NAME} est un ours brun aux yeux bleus, avec une casquette portée à l’envers bleu marine — la même teinte
              que la typographie de l’application.
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
                <span>Import depuis une photo ou un PDF</span>
              </li>
              <li className="flex gap-2">
                <Euro className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                <span>Tarifs alignés sur ton catalogue d’ouvrages</span>
              </li>
              <li className="flex gap-2">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" aria-hidden />
                <span>Paramètres TVA et structure adaptés à ton profil</span>
              </li>
            </ul>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
            PDF, envoi client et édition complète depuis la fiche devis.
          </p>
        </aside>
      </div>
    </div>
  );
}
