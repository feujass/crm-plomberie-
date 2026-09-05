export type ParsedDevisLigne = {
  designation: string;
  quantite: number;
  unite: string;
  prix_ht: number;
  tva: number;
  section: string;
};

function detectSeparator(line: string): ";" | "," {
  const semi = (line.match(/;/g) ?? []).length;
  const comma = (line.match(/,/g) ?? []).length;
  return semi >= comma ? ";" : ",";
}

function parseNumber(raw: string, fallback = 0): number {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

const HEADER_ALIASES: Record<string, keyof ParsedDevisLigne | "skip"> = {
  designation: "designation",
  libelle: "designation",
  description: "designation",
  poste: "designation",
  quantite: "quantite",
  qte: "quantite",
  qty: "quantite",
  unite: "unite",
  unit: "unite",
  prix_ht: "prix_ht",
  prixht: "prix_ht",
  pu_ht: "prix_ht",
  montant_ht: "prix_ht",
  tva: "tva",
  taux_tva: "tva",
  section: "section",
  categorie: "section",
};

/** Parse un CSV/TSV exporté depuis Excel ou un autre logiciel de devis. */
export function parseDevisImportCsv(text: string): ParsedDevisLigne[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) throw new Error("Fichier vide");

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) throw new Error("Aucune ligne dans le fichier");

  const sep = detectSeparator(lines[0]!);
  const firstCells = lines[0]!.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const maybeHeader = firstCells.some((c) => HEADER_ALIASES[normalizeHeader(c)]);

  let colMap: Partial<Record<keyof ParsedDevisLigne, number>> = {};
  let startIdx = 0;

  if (maybeHeader) {
    startIdx = 1;
    for (let i = 0; i < firstCells.length; i++) {
      const key = HEADER_ALIASES[normalizeHeader(firstCells[i] ?? "")];
      if (key && key !== "skip") colMap[key] = i;
    }
  } else {
    colMap = { designation: 0, quantite: 1, unite: 2, prix_ht: 3, tva: 4, section: 5 };
  }

  if (colMap.designation === undefined) {
    throw new Error("Colonne « designation » (ou libellé) introuvable dans l'en-tête");
  }

  const lignes: ParsedDevisLigne[] = [];
  for (let li = startIdx; li < lines.length; li++) {
    const cells = lines[li]!.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const designation = cells[colMap.designation!] ?? "";
    if (!designation.trim()) continue;

    lignes.push({
      designation: designation.trim(),
      quantite: parseNumber(cells[colMap.quantite ?? -1] ?? "1", 1) || 1,
      unite: (cells[colMap.unite ?? -1] ?? "u").trim() || "u",
      prix_ht: parseNumber(cells[colMap.prix_ht ?? -1] ?? "0", 0),
      tva: parseNumber(cells[colMap.tva ?? -1] ?? "10", 10),
      section: (cells[colMap.section ?? -1] ?? "").trim(),
    });
  }

  if (!lignes.length) throw new Error("Aucune ligne de devis valide trouvée");
  return lignes;
}

export const DEVIS_IMPORT_CSV_TEMPLATE = [
  "designation;quantite;unite;prix_ht;tva;section",
  "Dépose carrelage salle de bain;12;m²;35;10;Préparation",
  "Pose faïence murale;18;m²;45;10;Second œuvre",
  "Robinetterie lavabo + douche;1;forfait;280;10;Plomberie",
].join("\n");
