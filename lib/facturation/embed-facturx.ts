import { generate } from "@stafyniaksacha/facturx";
import { PDFDocument } from "pdf-lib";

import { addPdfA3OutputIntent } from "@/lib/facturation/pdf-a3";

export const FACTURES_EINVOICING_BUCKET = "factures-einvoicing";

export function facturXStoragePath(userId: string, factureId: string): string {
  return `${userId}/${factureId}/factur-x.pdf`;
}

export function facturXAlreadyGenerated(facture: { facturx_pdf_path?: string | null; facturx_xml?: string | null }): boolean {
  return Boolean(facture.facturx_pdf_path?.trim() || facture.facturx_xml?.trim());
}

/**
 * Embarque le XML CII dans le PDF visuel unique (déjà PDF/A-3 compatible : polices + ICC).
 * L’ICC est posé avant generate() pour ne pas réécrire le XMP Factur-X ensuite.
 */
export async function embedFacturXPdf(
  visualPdf: Uint8Array,
  xml: string,
  meta: { author: string; title: string; date: Date },
): Promise<Uint8Array> {
  const withIntent = await addPdfA3OutputIntent(visualPdf);
  const pdf = await PDFDocument.load(withIntent);
  pdf.context.trailerInfo.ID = undefined;
  const bytes = await generate({
    pdf,
    xml,
    check: false,
    flavor: "facturx",
    level: "en16931",
    language: "fr-FR",
    meta: {
      author: meta.author,
      title: meta.title,
      subject: meta.title,
      keywords: ["Facture", "Factur-X"],
      date: meta.date,
    },
  });
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
