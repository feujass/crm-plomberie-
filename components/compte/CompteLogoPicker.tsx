"use client";

import { createClient } from "@/lib/supabase/client";
import { fileToCompressedDataUrl } from "@/lib/imageCompress";
import { resolveClientLogoDisplayUrl } from "@/lib/supabase/client-logo-display";
import { toStorageRef } from "@/lib/supabase/logo-storage";
import { cx, focusRing } from "@/lib/utils";
import { ImagePlus, Link2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function isSupabaseEnvConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 600_000;

type Props = {
  name?: string;
  defaultUrl: string;
  maxEdge?: number;
  /** Photo de profil : libellés adaptés. */
  kind?: "logo" | "avatar";
};

export function CompteLogoPicker({ name = "logo_url", defaultUrl, maxEdge = 512, kind = "logo" }: Props) {
  const [logoUrl, setLogoUrl] = useState(defaultUrl);
  const [displayUrl, setDisplayUrl] = useState(defaultUrl);
  const [urlInput, setUrlInput] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlField, setShowUrlField] = useState(() => Boolean(defaultUrl?.trim().startsWith("http")));
  const fileRef = useRef<HTMLInputElement>(null);
  const isAvatar = kind === "avatar";

  useEffect(() => {
    setLogoUrl(defaultUrl);
    setUrlInput(defaultUrl);
    setShowUrlField(Boolean(defaultUrl?.trim().startsWith("http") || defaultUrl?.trim().startsWith("sb://")));
    void resolveClientLogoDisplayUrl(defaultUrl).then(setDisplayUrl);
  }, [defaultUrl]);

  useEffect(() => {
    void resolveClientLogoDisplayUrl(logoUrl).then(setDisplayUrl);
  }, [logoUrl]);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErr("Veuillez choisir une image (JPG, PNG, WebP…).");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setErr("Fichier trop volumineux (max 8 Mo).");
        return;
      }
      setErr(null);
      setBusy(true);
      try {
        let nextUrl: string | null = null;

        if (isSupabaseEnvConfigured()) {
          try {
            const supabase = createClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const ext = (file.name.split(".").pop() || "png").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png";
              const prefix = kind === "avatar" ? "avatar" : "logo";
              const path = `${user.id}/${prefix}-${Date.now()}.${ext}`;
              const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
              if (error) throw new Error(error.message);
              nextUrl = toStorageRef(path);
            }
          } catch {
            nextUrl = null;
          }
        }

        if (!nextUrl) {
          nextUrl = await fileToCompressedDataUrl(file, maxEdge, 0.88);
          if (nextUrl.length > MAX_DATA_URL_CHARS) {
            setErr("Image encore trop lourde après compression. Choisissez un fichier plus petit ou une image plus simple.");
            return;
          }
        }

        setLogoUrl(nextUrl);
        setUrlInput(nextUrl);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Import impossible.");
      } finally {
        setBusy(false);
      }
    },
    [maxEdge, kind],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f) void processFile(f);
    },
    [processFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void processFile(f);
    },
    [processFile],
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={logoUrl} readOnly onChange={() => {}} />

      <button
        type="button"
        disabled={busy}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cx(
          "w-full rounded-xl border-2 border-dashed p-5 text-center transition",
          dragOver
            ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5"
            : "border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-950/50",
          busy ? "pointer-events-none opacity-60" : "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600",
          focusRing,
        )}
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onPick} />
        {logoUrl ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo utilisateur (data URL ou externe) */}
            <img src={displayUrl} alt="" className="size-20 rounded-lg border border-gray-200 object-cover dark:border-gray-700" />
            <div className="text-left text-sm">
              <p className="font-medium text-[var(--foreground)]">{busy ? "Traitement…" : isAvatar ? "Photo sélectionnée" : "Logo sélectionné"}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Cliquez ou glissez une autre image pour remplacer.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="flex size-12 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <Upload className="size-6 text-[color:var(--primary)]" aria-hidden />
            </span>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {busy ? "Import en cours…" : isAvatar ? "Glissez-déposez votre photo ici" : "Glissez-déposez votre logo ici"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ou cliquez pour parcourir vos fichiers (JPG, PNG, WebP, GIF)
            </p>
          </div>
        )}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900",
            focusRing,
          )}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <ImagePlus className="size-3.5" aria-hidden />
          Choisir un fichier
        </button>
        {logoUrl ? (
          <button
            type="button"
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900",
              focusRing,
            )}
            onClick={() => {
              setLogoUrl("");
              setUrlInput("");
              setErr(null);
            }}
            disabled={busy}
          >
            Retirer {isAvatar ? "la photo" : "le logo"}
          </button>
        ) : null}
        <button
          type="button"
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-gray-600 underline-offset-2 hover:underline dark:text-gray-400",
            focusRing,
          )}
          onClick={() => setShowUrlField((v) => !v)}
        >
          <Link2 className="size-3.5" aria-hidden />
          {showUrlField ? "Masquer l’URL" : "Ou coller une URL"}
        </button>
      </div>

      {showUrlField ? (
        <label className="block text-left">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            URL de l’image (optionnel)
          </span>
          <input
            type="url"
            inputMode="url"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[var(--foreground)] dark:border-gray-700 dark:bg-gray-950"
            placeholder="https://…"
            value={urlInput}
            onChange={(ev) => {
              const v = ev.target.value;
              setUrlInput(v);
              setLogoUrl(v);
              setErr(null);
            }}
          />
        </label>
      ) : null}

      {err ? <p className="text-center text-xs text-red-600 dark:text-red-400">{err}</p> : null}

      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-gray-400">
        <ImagePlus className="size-3.5 shrink-0" aria-hidden />
        {isAvatar
          ? "Format carré recommandé. La photo est compressée et enregistrée avec votre compte."
          : "Format carré recommandé. Sans hébergement fichiers, le logo est compressé et enregistré avec votre compte."}
      </p>
    </div>
  );
}
