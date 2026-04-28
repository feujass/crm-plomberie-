/** Ouvrages seed onboarding étape 3 — aligné sur l’ancienne action serveur. */
export const ONBOARDING_EXAMPLE_OUVRAGES = [
  {
    nom: "Main d'œuvre plomberie",
    description: "Intervention horaire",
    type: "main_oeuvre",
    prix_ht: 55,
    unite: "h",
    tva: 10,
    tags: ["mo"],
  },
  {
    nom: "Remplacement robinet",
    description: "Fourniture + pose",
    type: "ouvrage",
    prix_ht: 120,
    unite: "forfait",
    tva: 10,
    tags: ["sanitaire"],
  },
  {
    nom: "Pose chauffe-eau",
    description: "Forfait pose",
    type: "ouvrage",
    prix_ht: 350,
    unite: "forfait",
    tva: 10,
    tags: ["chauffage"],
  },
] as const;
