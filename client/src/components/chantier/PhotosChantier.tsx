type Props = {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  projectId: number | string;
};

const SLOT_COUNT = 3;

export function PhotosChantier({ photoUrls, onChange, projectId }: Props) {
  const addPhoto = () => {
    const url = `https://picsum.photos/seed/${encodeURIComponent(String(projectId))}-${Date.now()}/320/240`;
    onChange([...photoUrls, url]);
  };

  return (
    <div className="photos-chantier">
      <span className="muted" style={{ fontWeight: 600 }}>
        Photos de chantier
      </span>
      <div className="photos-chantier-grid">
        {Array.from({ length: SLOT_COUNT }, (_, index) => {
          const url = photoUrls[index];
          return (
            <button
              key={index}
              type="button"
              className="photo-slot"
              onClick={() => {
                if (!url) addPhoto();
              }}
              title={url ? "Photo chantier" : "Ajouter une photo (démo)"}
            >
              {url ? <img src={url} alt="" /> : "🖼"}
            </button>
          );
        })}
      </div>
      <button type="button" className="ghost small btn-add-photo" onClick={addPhoto}>
        + Ajouter photo
      </button>
    </div>
  );
}
