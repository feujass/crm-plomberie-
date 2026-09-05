type LigneType = "prestation" | "fourniture" | "pose";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse un nombre renvoyé par le LLM (string, virgule, symboles € / %). */
export function parseLlmNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const cleaned = raw.replace(/[^\d.-]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** TVA : accepte 10, "10%", 0.1 → 10. */
export function parseLlmTva(value: unknown): number | undefined {
  const n = parseLlmNumber(value);
  if (n === undefined) return undefined;
  if (n > 0 && n <= 1) return Math.round(n * 1000) / 10;
  return n;
}

function normalizeLigneType(value: unknown): LigneType | undefined {
  if (value === "prestation" || value === "fourniture" || value === "pose") return value;
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!s) return undefined;
  if (s.includes("fourn") || s.includes("mat") || s.includes("matériel")) return "fourniture";
  if (s.includes("pose")) return "pose";
  if (s.includes("main") || s.includes("mo") || s.includes("prest") || s.includes("service")) {
    return "prestation";
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeLigne(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const designation =
    pickString(raw, "designation", "description", "libelle", "label", "name", "nom") ?? "";
  const quantite = parseLlmNumber(raw.quantite ?? raw.quantity ?? raw.qte ?? raw.qty);
  const unite = pickString(raw, "unite", "unit", "u") ?? "u";
  const prix_ht = parseLlmNumber(raw.prix_ht ?? raw.prixHT ?? raw.price ?? raw.pu_ht ?? raw.pu);
  const tva = parseLlmTva(raw.tva ?? raw.TVA ?? raw.vat ?? raw.taxe);
  const section = pickString(raw, "section", "piece", "groupe");
  const ligne_type = normalizeLigneType(raw.ligne_type ?? raw.type ?? raw.ligneType);

  if (!designation || quantite === undefined || prix_ht === undefined || tva === undefined) {
    return null;
  }

  return {
    designation,
    quantite,
    unite,
    prix_ht,
    tva,
    ...(section ? { section } : {}),
    ...(ligne_type ? { ligne_type } : {}),
  };
}

function normalizeClient(raw: unknown): Record<string, unknown> | null | undefined {
  if (raw === null || raw === undefined) return raw;
  if (!isRecord(raw)) return null;

  const out: Record<string, unknown> = {};
  const nom = pickString(raw, "nom", "name", "lastName");
  const prenom = pickString(raw, "prenom", "firstName");
  const email = pickString(raw, "email", "mail");
  const tel = pickString(raw, "tel", "telephone", "phone");
  const adresse = pickString(raw, "adresse", "address");

  if (nom) out.nom = nom;
  if (prenom) out.prenom = prenom;
  if (email) out.email = email;
  if (tel) out.tel = tel;
  if (adresse) out.adresse = adresse;

  return Object.keys(out).length ? out : null;
}

/** Assouplit la réponse Claude avant validation Zod (types, clés EN, alias). */
export function normalizeDevisIaParsed(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const lignesRaw = raw.lignes ?? raw.lines ?? raw.devis_lignes ?? raw.items;
  const lignes = Array.isArray(lignesRaw)
    ? lignesRaw.map(normalizeLigne).filter((l): l is Record<string, unknown> => l !== null)
    : [];

  const adresse_chantier =
    pickString(raw, "adresse_chantier", "adresseChantier", "chantier", "site_address", "address") ?? null;

  const notes = pickString(raw, "notes", "conditions", "commentaires") ?? null;
  const date_expiration = pickString(raw, "date_expiration", "dateExpiration", "expiration") ?? null;
  const validite_jours = parseLlmNumber(raw.validite_jours ?? raw.validiteJours ?? raw.validity_days);
  const acompte_pourcent = parseLlmNumber(raw.acompte_pourcent ?? raw.acomptePourcent ?? raw.deposit_percent);

  return {
    lignes,
    adresse_chantier,
    client: normalizeClient(raw.client),
    notes,
    validite_jours: validite_jours ?? null,
    acompte_pourcent: acompte_pourcent ?? null,
    date_expiration,
  };
}
