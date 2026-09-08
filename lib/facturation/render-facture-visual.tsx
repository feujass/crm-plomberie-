import { pdf } from "@react-pdf/renderer";
import React from "react";
import sharp from "sharp";

import { FacturePdfDocument } from "@/components/pdf/FacturePdfDocument";
import { FACTURX_NOTES_CIUS_FR, type FacturXSource } from "@/lib/facturation/build-facturx-xml";
import { centsToXml, milliToXml } from "@/lib/facturation/cents";
import { formatDateFr } from "@/lib/format";
import { addPdfA3OutputIntent } from "@/lib/facturation/pdf-a3";
import { registerFacturePdfFonts } from "@/lib/facturation/pdf-fonts";
import { mentionFranchise293B } from "@/lib/facturation/regime-tva";
import { computeFactureTotals } from "@/lib/facturation/totals";

function formatAdresse(addr: { ligne1: string; ligne2: string; cp: string; ville: string }): string {
  return [addr.ligne1, addr.ligne2, `${addr.cp} ${addr.ville}`.trim()].filter(Boolean).join(", ");
}

/** JPEG opaque (fond blanc) — la transparence PNG casse le PDF/A-3. */
export async function flattenLogoToJpegDataUrl(src: string | null | undefined): Promise<string | null> {
  const raw = String(src ?? "").trim();
  if (!raw) return null;
  try {
    let input: Buffer;
    if (raw.startsWith("data:")) {
      const b64 = raw.split(",")[1];
      if (!b64) return null;
      input = Buffer.from(b64, "base64");
    } else {
      const res = await fetch(raw);
      if (!res.ok) return null;
      input = Buffer.from(await res.arrayBuffer());
    }
    const jpeg = await sharp(input).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Unique rendu visuel de facture (même document que le conteneur Factur-X).
 */
export async function renderFactureVisualPdf(
  source: FacturXSource,
  logoUrl?: string | null,
): Promise<Uint8Array> {
  registerFacturePdfFonts();
  const totals = computeFactureTotals({
    lignes: source.lignes,
    regimeTva: source.regimeTva,
    montantPaye: source.montantPaye,
  });
  const logo = await flattenLogoToJpegDataUrl(logoUrl);
  const blob = await pdf(
    <FacturePdfDocument
      profile={{
        entreprise_nom: source.emetteur.entreprise_nom,
        adresse: formatAdresse(source.emetteur.adresse),
        tel: source.emetteur.tel,
        email_facturation: source.emetteur.email_facturation,
        siret: source.emetteur.siret,
        logo_url: logo,
        mention_legale: [mentionFranchise293B(source.regimeTva), ...FACTURX_NOTES_CIUS_FR.map((n) => n.content)]
          .filter(Boolean)
          .join("\n"),
        conditions_paiement_defaut: null,
      }}
      client={{
        nom: source.client.nom,
        prenom: source.client.prenom,
        adresse: formatAdresse(source.client.adresse_facturation),
      }}
      numero={source.numero}
      dateEmissionLabel={formatDateFr(source.dateEmission)}
      documentTitle={source.typeCode === "381" ? "Avoir" : "Facture"}
      lignes={totals.lignes.map((l, idx) => ({
        id: `l-${idx}`,
        designation: l.designation,
        quantite: milliToXml(l.qtyMilli),
        unite: l.unite,
        prix_ht: centsToXml(l.netUnitCents),
        tva: centsToXml(l.rateCenti),
        total_ht: centsToXml(l.lineHtCents),
      }))}
      total_ht={centsToXml(totals.lineTotalCents)}
      total_tva={centsToXml(totals.taxTotalCents)}
      total_ttc={centsToXml(totals.grandCents)}
      notes={source.notes}
    />,
  ).toBlob();
  const visual = new Uint8Array(await blob.arrayBuffer());
  return addPdfA3OutputIntent(visual);
}

export { facturePdfFontDir as facturXFontDir } from "@/lib/facturation/pdf-fonts";
