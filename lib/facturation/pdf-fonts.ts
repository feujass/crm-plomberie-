import { Font } from "@react-pdf/renderer";
import path from "node:path";

export const FACTURE_PDF_FONT = "LiberationSans";

export function facturePdfFontDir(): string {
  return path.join(process.cwd(), "lib/facturation/fonts");
}

let registered = false;

export function registerFacturePdfFonts(): void {
  if (registered) return;
  const dir = facturePdfFontDir();
  Font.register({
    family: FACTURE_PDF_FONT,
    fonts: [
      { src: path.join(dir, "LiberationSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "LiberationSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  registered = true;
}
