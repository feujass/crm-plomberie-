import { readFileSync } from "node:fs";
import path from "node:path";

import { PDFDocument, PDFName, PDFString } from "pdf-lib";

export function srgbIccPath(): string {
  return path.join(process.cwd(), "lib/facturation/icc/sRGB2014.icc");
}

/**
 * PDF/A-3 exige un OutputIntent (profil ICC).
 * generate() pose le XMP Factur-X mais pas l’ICC : on le pose sur le PDF visuel avant embarquement.
 * Profil : Compact ICC sRGB (CC0, saucecontrol) — N=3, version 2.
 */
export async function addPdfA3OutputIntent(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  if (pdf.catalog.get(PDFName.of("OutputIntents"))) {
    return pdfBytes;
  }
  const icc = readFileSync(srgbIccPath());
  const iccStream = pdf.context.flateStream(icc, {
    N: 3,
    Range: pdf.context.obj([0, 1, 0, 1, 0, 1]),
  });
  const iccRef = pdf.context.register(iccStream);
  const intent = pdf.context.obj({
    Type: "OutputIntent",
    S: "GTS_PDFA1",
    OutputConditionIdentifier: PDFString.of("sRGB IEC61966-2.1"),
    OutputCondition: PDFString.of("sRGB IEC61966-2.1"),
    RegistryName: PDFString.of("http://www.color.org"),
    Info: PDFString.of("sRGB IEC61966-2.1"),
    DestOutputProfile: iccRef,
  });
  const intentRef = pdf.context.register(intent);
  pdf.catalog.set(PDFName.of("OutputIntents"), pdf.context.obj([intentRef]));
  pdf.context.trailerInfo.ID = undefined;
  const saved = await pdf.save({ useObjectStreams: false });
  return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
}
