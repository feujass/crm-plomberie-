/**
 * Réduit le poids pour l’API (Vercel ~4,5 Mo max sur le corps de la requête).
 * Convertit en JPEG avec redimensionnement.
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
    return new Promise((resolve, reject) => {
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
        quality
      );
    });
  } finally {
    if (typeof bmp.close === "function") bmp.close();
  }
}
