export const MARKETING_PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    description: "L'essentiel pour créer et envoyer tes devis rapidement.",
    badge: "Pour démarrer",
    monthlyEur: 25,
    yearlyEur: 240,
    popular: false,
    includesLabel: "Inclus :",
    features: [
      "Zeus IA : 25 devis vocaux/mois",
      "Catalogue : 30 prix personnalisés",
      "Envoi client + statuts",
      "Relances simples",
    ],
  },
  {
    id: "pro_plus" as const,
    name: "Pro+",
    description: "Zeus, suivi et facturation pour gagner du temps chaque jour.",
    badge: "Recommandé",
    monthlyEur: 30,
    yearlyEur: 300,
    popular: true,
    includesLabel: "Tout le plan Pro, plus :",
    features: [
      "Zeus IA : 80 devis vocaux/mois",
      "Catalogue illimité (prix personnalisés)",
      "Préparation facturation électronique",
      "Suivi des paiements clients",
    ],
  },
  {
    id: "pme" as const,
    name: "PME",
    description: "Rentabilité, tableaux de bord et quota Zeus illimité pour piloter ton activité.",
    badge: "Pour les entreprises qui grandissent",
    monthlyEur: 49,
    yearlyEur: 492,
    popular: false,
    includesLabel: "Tout le plan Pro+, plus :",
    features: [
      "Zeus IA : devis vocaux illimités",
      "Rentabilité & tableaux de bord avancés",
      "Exports compta & FEC",
      "Support prioritaire",
    ],
  },
];

export const DEMO_KPIS = [
  { label: "Devis du mois", value: "8" },
  { label: "Taux acceptation", value: "68 %" },
  { label: "CA signé (mois)", value: "24 350 €" },
  { label: "En attente", value: "8 200 €" },
] as const;

export const DEMO_DEVIS_LIST = [
  { numero: "DV-2026-042", client: "Martin", statut: "envoye", montant: "3 450 €", date: "24 mai" },
  { numero: "DV-2026-041", client: "Dupont", statut: "accepte", montant: "12 800 €", date: "22 mai" },
] as const;

export const DEMO_CHART = [
  { mois: "Déc", ca: 14200 },
  { mois: "Jan", ca: 16800 },
  { mois: "Fév", ca: 15100 },
  { mois: "Mar", ca: 18900 },
  { mois: "Avr", ca: 22100 },
  { mois: "Mai", ca: 24350 },
] as const;

export const DEMO_LIGNES = [
  { designation: "Dépose faïence existante", qte: "6", unite: "m²", pu_ht: "32,00 €", tva: "10 %", total_ht: "192,00 €" },
  { designation: "Pose carrelage sol grès cérame", qte: "6", unite: "m²", pu_ht: "58,00 €", tva: "10 %", total_ht: "348,00 €" },
  { designation: "Pose faïence murale", qte: "14", unite: "m²", pu_ht: "48,00 €", tva: "10 %", total_ht: "672,00 €" },
  {
    designation: "Plomberie, robinetterie et évacuations",
    qte: "1",
    unite: "forfait",
    pu_ht: "1 250,00 €",
    tva: "10 %",
    total_ht: "1 250,00 €",
  },
  { designation: "Fournitures (robinetterie, colles, joints)", qte: "1", unite: "lot", pu_ht: "674,00 €", tva: "20 %", total_ht: "674,00 €" },
] as const;

export const DEMO_TOTALS = { total_ht: "3 136,00 €", total_tva: "314,00 €", total_ttc: "3 450,00 €" } as const;

export const DEMO_ENTREPRISE = { nom: "Plomberie Durand", siret: "123 456 789 00012", ville: "75011 Paris" } as const;

export const DEMO_TRANSCRIPT =
  "Rénovation salle de bain 6 m² : dépose carrelage, pose faïence murale et sol, remplacement robinetterie lavabo et douche, évacuations et petites adaptations électriques.";

export const DEMO_FACTURE = {
  numero: "FACT-2026-018",
  devis_ref: "DV-2026-042",
  client: "M. Martin",
  date_emission: "2 juin 2026",
  date_echeance: "2 juillet 2026",
  statut: "emise" as const,
  ...DEMO_TOTALS,
};

export const DEMO_CATALOGUE = [
  {
    nom: "Main d'œuvre plomberie",
    description: "Intervention horaire",
    type: "main_oeuvre" as const,
    prix_ht: 55,
    unite: "h",
  },
  {
    nom: "Robinet mitigeur Grohe",
    description: "Fourniture standard salle de bain",
    type: "fourniture" as const,
    prix_ht: 189,
    unite: "u",
  },
  {
    nom: "Pose chauffe-eau",
    description: "Forfait pose + raccordements",
    type: "ouvrage" as const,
    prix_ht: 420,
    unite: "forfait",
  },
  {
    nom: "Débouchage canalisation",
    description: "Forfait intervention",
    type: "ouvrage" as const,
    prix_ht: 145,
    unite: "forfait",
  },
] as const;
