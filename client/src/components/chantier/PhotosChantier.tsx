import { useRef } from "react";

type Props = {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
};

/** Taille max par image (data URL stockée en base — rester raisonnable). */
const MAX_BYTES = 1.5 * 1024 * 1024;

const SLOT_COUNT = 3;

export function PhotosChantier({ photoUrls, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  const appendImagesFromFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      alert("Choisissez un fichier image (JPEG, PNG, WebP…).");
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      alert(`« ${tooBig.name} » dépasse 1,5 Mo. Compressez l’image ou choisissez un fichier plus léger.`);
      return;
    }

    const readers = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error("read"));
          r.readAsDataURL(file);
        })
    );

    void Promise.all(readers)
      .then((dataUrls) => onChange([...photoUrls, ...dataUrls]))
      .catch(() => alert("Impossible de lire une des images."));
  };

  return (
    <div className="photos-chantier">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="photos-file-input"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          appendImagesFromFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="muted" style={{ fontWeight: 600 }}>
        Photos de chantier
      </span>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Cliquez sur une case vide ou sur « Ajouter photo » pour choisir une image sur votre appareil.
      </p>
      <div className="photos-chantier-grid">
        {Array.from({ length: SLOT_COUNT }, (_, index) => {
          const url = photoUrls[index];
          return (
            <button
              key={index}
              type="button"
              className="photo-slot"
              onClick={() => {
                if (!url) openPicker();
              }}
              title={url ? "Aperçu photo" : "Choisir une photo"}
            >
              {url ? <img src={url} alt="" /> : "＋"}
            </button>
          );
        })}
      </div>
      <button type="button" className="ghost small btn-add-photo" onClick={openPicker}>
        + Ajouter photo
      </button>
    </div>
  );
}
