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
        )}</text>
        <text x="480" y="${72 + i * 28}" font-family="system-ui,sans-serif" font-size="14" fill="#94a3b8">${escapeXml("••• €")}</text>`,
    )
    .join("");
  const height = Math.max(220, 96 + lignes.length * 28);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="24" y="36" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#0f172a">Aperçu devis Zeus (${lignes.length} lignes)</text>
  ${rows}
  <text x="24" y="${Math.max(200, 80 + lignes.length * 28)}" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#64748b">Total TTC : ••• € (crée ton compte pour voir)</text>
</svg>`;
}

/** PNG aperçu démo — intitulés lisibles, prix masqués. */
export async function renderBlurredPreviewPngBase64(lignes: DevisIaResponse["lignes"]): Promise<string> {
  const totalTtc = computeDemoTotalTtc(lignes);
  const svg = buildQuoteSvg(lignes, totalTtc);
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return png.toString("base64");
}
