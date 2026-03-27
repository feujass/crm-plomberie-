import { useId, useState } from "react";
import { fileToCompressedDataUrl } from "../../utils/imageCompress";

type Props = {
  photoUrls: string[];
  onChange: (urls: string[]) => Promise<void> | void;
};

/** Fichier brut max avant compression (on réduit ensuite en JPEG). */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export function PhotosChantier({ photoUrls, onChange }: Props) {
  const reactId = useId();
  const inputId = `chantier-photos-${reactId.replace(/:/g, "")}`;
  const [busy, setBusy] = useState(false);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)
    );
    if (files.length === 0) {
      alert("Choisissez un fichier image (JPEG, PNG, WebP…).");
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_INPUT_BYTES);
    if (tooBig) {
      alert(`« ${tooBig.name} » est trop lourd (max 12 Mo avant compression).`);
      return;
    }

    setBusy(true);
    let dataUrls: string[] = [];
    try {
      for (const file of files) {
        dataUrls.push(await fileToCompressedDataUrl(file));
      }
    } catch (e) {
      console.error(e);
      alert(
        "Impossible de lire ou de réduire cette image. Essayez une photo JPEG ou PNG, ou une autre image."
      );
      setBusy(false);
      return;
    }
    try {
      await Promise.resolve(onChange([...photoUrls, ...dataUrls]));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const removeAt = async (index: number) => {
    if (!photoUrls[index]) return;
    setBusy(true);
    try {
      await Promise.resolve(onChange(photoUrls.filter((_, i) => i !== index)));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photos-chantier">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="photos-file-input-native"
        onChange={(e) => {
          void processFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="muted" style={{ fontWeight: 600 }}>
        Photos de chantier
      </span>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        {busy
          ? "Enregistrement en cours…"
          : "Case « + » ou bouton pour ajouter. Survol d’une photo : ✕ pour supprimer."}
      </p>
      <div className="photos-chantier-grid">
        {photoUrls.map((url, index) => (
          <div key={`${index}-${url.slice(0, 48)}`} className="photo-slot photo-slot--filled" role="group" aria-label="Photo chantier">
            <img src={url} alt="" />
            <button
              type="button"
              className="photo-remove"
              disabled={busy}
              title="Supprimer cette photo"
              aria-label="Supprimer cette photo"
              onClick={(e) => {
                e.stopPropagation();
                void removeAt(index);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <label htmlFor={inputId} className="photo-slot photo-slot--pick" title="Ajouter une photo">
          ＋
        </label>
      </div>
      <label htmlFor={inputId} className={`ghost small btn-add-photo${busy ? " muted" : ""}`} style={{ cursor: busy ? "wait" : "pointer" }}>
        + Ajouter photo
      </label>
    </div>
  );
}
