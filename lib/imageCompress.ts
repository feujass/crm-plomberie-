/**
 * Réduit le poids avant envoi API en convertissant en JPEG + redimensionnement.
 * Utile pour stocker des photos de chantier en Data URL (MVP).
 */
export async function fileToCompressedDataUrl(file: File, maxEdge = 1600, quality = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.drawImage(bmp, 0, 0, w, h);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression impossible"));
            return;
          }
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error("Lecture impossible"));
          r.readAsDataURL(blob);
        },
        "image/jpeg",
        quality,
      );
    });
  } finally {
    if (typeof (bmp as ImageBitmap).close === "function") (bmp as ImageBitmap).close();
  }
}

