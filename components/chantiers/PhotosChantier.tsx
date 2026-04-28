"use client";

import { useId, useState } from "react";

import { fileToCompressedDataUrl } from "@/lib/imageCompress";
import { cx } from "@/lib/utils";

type Props = {
  photoUrls: string[];
  onChange: (urls: string[]) => Promise<void> | void;
};

/** Fichier brut max avant compression. */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_INPUT_LABEL = "12 Mo";

export function PhotosChantier({ photoUrls, onChange }: Props) {
  const reactId = useId();
  const inputId = `chantier-photos-${reactId.replace(/:/g, "")}`;
  const [busy, setBusy] = useState(false);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) {
      alert("Choisissez un fichier image (JPEG, PNG, WebP…).");
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_INPUT_BYTES);
    if (tooBig) {
      alert(`« ${tooBig.name} » est trop lourd (max ${MAX_INPUT_LABEL} par fichier avant compression).`);
      return;
    }

    setBusy(true);
    try {
      const dataUrls: string[] = [];
      for (const file of files) dataUrls.push(await fileToCompressedDataUrl(file));
      await Promise.resolve(onChange([...photoUrls, ...dataUrls]));
    } catch (e) {
      console.error(e);
      alert("Impossible de lire ou de réduire cette image. Essayez une photo JPEG/PNG.");
    } finally {
      setBusy(false);
    }
  };

  const removeAt = async (index: number) => {
    if (!photoUrls[index]) return;
    setBusy(true);
    try {
      await Promise.resolve(onChange(photoUrls.filter((_, i) => i !== index)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--foreground)]">Photos de chantier</span>
        <label
          htmlFor={inputId}
          className={cx(
            "touch-target inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[color:var(--primary)] hover:bg-[var(--accent)]/60",
            busy ? "opacity-60" : "",
          )}
        >
          Ajouter
        </label>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        {busy ? (
          "Enregistrement en cours…"
        ) : (
          <>
            Taille max. <strong>{MAX_INPUT_LABEL}</strong> par fichier sur l’appareil (compression automatique).
          </>
        )}
      </p>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        className="hidden"
        onChange={(e) => {
          void processFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photoUrls.map((url, index) => (
          <div
            key={`${index}-${url.slice(0, 32)}`}
            className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]"
          >
            {/* Data URLs: on évite next/image ici pour rester simple en dev. */}
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              disabled={busy}
              onClick={() => void removeAt(index)}
              className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/70"
              aria-label="Supprimer cette photo"
              title="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
        {photoUrls.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--muted-foreground)]">
            Ajoute des photos pour garder l’historique du chantier.
          </div>
        ) : null}
      </div>
    </div>
  );
}

