import type { DevisIaResponse } from "@/lib/schemas/devis-ia";

import { computeDemoTotalTtc } from "@/lib/demo/quote-math";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildQuoteSvg(lignes: DevisIaResponse["lignes"], totalTtc: number): string {
  const rows = lignes
    .map(
      (l, i) =>
        `<text x="24" y="${72 + i * 28}" font-family="system-ui,sans-serif" font-size="14" fill="#334155">${escapeXml(
          `${i + 1}. ${l.designation} — ${l.quantite} ${l.unite}`,
        )}</text>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${Math.max(220, 96 + lignes.length * 28)}" viewBox="0 0 640 ${Math.max(220, 96 + lignes.length * 28)}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="24" y="36" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#0f172a">Aperçu devis Zeus</text>
  ${rows}
  <text x="24" y="${Math.max(200, 80 + lignes.length * 28)}" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#0f172a">Total TTC : ${totalTtc.toFixed(2)} €</text>
</svg>`;
}

/** PNG flouté côté serveur — le client ne reçoit jamais le texte lisible complet. */
export async function renderBlurredPreviewPngBase64(lignes: DevisIaResponse["lignes"]): Promise<string> {
  const totalTtc = computeDemoTotalTtc(lignes);
  const svg = buildQuoteSvg(lignes, totalTtc);
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg)).png().blur(14).toBuffer();
  return png.toString("base64");
}
