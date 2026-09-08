export type AdresseStructuree = {
  ligne1: string;
  ligne2: string;
  cp: string;
  ville: string;
  pays: string;
};

export type AdresseStructureProposition = AdresseStructuree & {
  source: "parse";
  blob: string;
};

function normPart(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function emptyAdresse(): AdresseStructuree {
  return { ligne1: "", ligne2: "", cp: "", ville: "", pays: "FR" };
}

export function isAdresseComplete(addr: AdresseStructuree | null | undefined): boolean {
  if (!addr) return false;
  return Boolean(addr.ligne1.trim() && addr.cp.trim() && addr.ville.trim() && addr.pays.trim());
}

/** Comparaison champ à champ après normalisation (livraison vs facturation). */
export function adressesEquivalentes(
  a: AdresseStructuree | null | undefined,
  b: AdresseStructuree | null | undefined,
): boolean {
  const aa = a ?? emptyAdresse();
  const bb = b ?? emptyAdresse();
  return (
    normPart(aa.ligne1) === normPart(bb.ligne1) &&
    normPart(aa.ligne2) === normPart(bb.ligne2) &&
    normPart(aa.cp) === normPart(bb.cp) &&
    normPart(aa.ville) === normPart(bb.ville) &&
    normPart(aa.pays) === normPart(bb.pays)
  );
}

const CP_VILLE_RE = /\b(\d{5})\s+([A-Za-zÀ-ÿ'’\- ]{2,})$/;

/**
 * Proposition uniquement — ne jamais écrire dans les colonnes structurées
 * sans confirmation artisan.
 */
export function proposerAdresseDepuisBlob(blob: string | null | undefined): AdresseStructureProposition | null {
  const raw = String(blob ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return null;

  const m = raw.match(CP_VILLE_RE);
  if (!m) {
    return {
      source: "parse",
      blob: raw,
      ligne1: raw,
      ligne2: "",
      cp: "",
      ville: "",
      pays: "FR",
    };
  }

  const cp = m[1] ?? "";
  const ville = (m[2] ?? "").trim();
  const ligne1 = raw.slice(0, m.index).replace(/[,\s]+$/, "").trim();
  return {
    source: "parse",
    blob: raw,
    ligne1: ligne1 || raw,
    ligne2: "",
    cp,
    ville,
    pays: "FR",
  };
}

export function fromDbAdresse(prefix: Record<string, unknown>, keys: {
  ligne1: string;
  ligne2: string;
  cp: string;
  ville: string;
  pays: string;
}): AdresseStructuree {
  return {
    ligne1: String(prefix[keys.ligne1] ?? "").trim(),
    ligne2: String(prefix[keys.ligne2] ?? "").trim(),
    cp: String(prefix[keys.cp] ?? "").trim(),
    ville: String(prefix[keys.ville] ?? "").trim(),
    pays: (String(prefix[keys.pays] ?? "").trim() || "FR").toUpperCase(),
  };
}
