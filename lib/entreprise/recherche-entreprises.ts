export type EntrepriseGouvResult = {
  siren: string | null;
  nom: string | null;
  forme_juridique: string | null;
  adresse: string | null;
  rcs_ville: string | null;
};

type GouvSiege = {
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
};

type GouvResult = {
  nom_complet?: string;
  nom_raison_sociale?: string;
  siren?: string;
  nature_juridique?: string;
  siege?: GouvSiege;
};

type GouvResponse = {
  results?: GouvResult[];
};

/** Lookup SIRET via l'API publique Recherche Entreprises (sans clé). */
export async function lookupEntrepriseBySiret(siret: string): Promise<EntrepriseGouvResult | null> {
  const digits = siret.replace(/\D/g, "");
  if (digits.length !== 14) return null;

  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(digits)}&page=1&per_page=1`,
      { headers: { Accept: "application/json" }, next: { revalidate: 0 } },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as GouvResponse;
    const hit = json.results?.[0];
    if (!hit) return null;

    const siege = hit.siege;
    const adresseParts = [siege?.adresse, siege?.code_postal, siege?.libelle_commune].filter(Boolean);
    const adresse = adresseParts.length ? adresseParts.join(", ") : null;

    return {
      siren: hit.siren ?? digits.slice(0, 9),
      nom: hit.nom_complet ?? hit.nom_raison_sociale ?? null,
      forme_juridique: hit.nature_juridique ?? null,
      adresse,
      rcs_ville: siege?.libelle_commune ?? null,
    };
  } catch {
    return null;
  }
}
