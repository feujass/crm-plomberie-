/** Aperçus « type Renato » — doivent correspondre au seed backend `/ouvrages/seed-defaults`. */
export const CATALOGUE_EXEMPLES_APERCU = [
  {
    nom: "Taux horaire standard",
    description: "Tarif horaire de base pour la main d'œuvre",
    type: "main_oeuvre" as const,
    prix_ht: 50,
    unite: "h",
  },
  {
    nom: "Lame de parquet chêne massif",
    description: "Exemple de fourniture — personnalisable après ajout.",
    type: "fourniture" as const,
    prix_ht: 48,
    unite: "m²",
  },
  {
    nom: "Pose et finition",
    description: "Exemple d'ouvrage — prestation et mise en œuvre.",
    type: "ouvrage" as const,
    prix_ht: 35,
    unite: "m²",
  },
];
