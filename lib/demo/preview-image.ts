import type { DevisIaResponse } from "@/lib/schemas/devis-ia";

import { computeDemoTotalTtc } from "@/lib/demo/quote-math";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function buildQuoteSvg(lignes: DevisIaResponse["lignes"], total: number, totalLabel: string): string {
  const rows = lignes
    .map((l, i) => {
      const unit = Number(l.prix_ht ?? l.prix_unitaire_ht) || 0;
      const lineHt = Math.round(unit * (Number(l.quantite) || 0) * 100) / 100;
      return `<text x="24" y="${72 + i * 28}" font-family="system-ui,sans-serif" font-size="14" fill="#334155">${escapeXml(
        `${i + 1}. ${l.designation} — ${l.quantite} ${l.unite}`,
      )}</text>
        <text x="430" y="${72 + i * 28}" font-family="system-ui,sans-serif" font-size="14" fill="#0f172a" text-anchor="end">${escapeXml(formatEuro(lineHt))}</text>`;
    })
    .join("");
  const height = Math.max(220, 96 + lignes.length * 28);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="24" y="36" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#0f172a">Devis (${lignes.length} lignes)</text>
  ${rows}
  <text x="24" y="${Math.max(200, 80 + lignes.length * 28)}" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(totalLabel)} : ${escapeXml(formatEuro(total))}</text>
</svg>`;
}

/** PNG aperçu démo — lignes et prix visibles. */
export async function renderBlurredPreviewPngBase64(
  lignes: DevisIaResponse["lignes"],
  options?: { showTva?: boolean },
): Promise<string> {
  const showTva = options?.showTva !== false && lignes.some((line) => Number(line.tva) > 0);
  const total = showTva
    ? computeDemoTotalTtc(lignes)
    : lignes.reduce((sum, line) => {
        const unit = Number(line.prix_ht ?? line.prix_unitaire_ht) || 0;
        return sum + Math.round(unit * (Number(line.quantite) || 0) * 100) / 100;
      }, 0);
  const svg = buildQuoteSvg(lignes, Math.round(total * 100) / 100, showTva ? "Total TTC" : "Total HT");
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return png.toString("base64");
}
