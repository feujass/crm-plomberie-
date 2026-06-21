export const MARKETING_PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    description: "L'essentiel pour créer et envoyer vos devis rapidement.",
    badge: "Pour démarrer",
    monthlyEur: 25,
    yearlyEur: 240,
    popular: false,
    includesLabel: "Inclus :",
    features: [
      "Devis illimités + PDF",
      "Zeus IA : 10 devis vocaux/mois",
      "Envoi client + statuts",
      "Relances simples",
      "Accès mobile",
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
      "Assistant Zeus (devis vocal)",
      "Préparation facturation électronique",
      "Suivi des paiements clients",
      "Catalogue avancé (prix personnalisés)",
    ],
  },
  {
    id: "pme" as const,
    name: "PME",
    description: "Gérez plusieurs techniciens, suivez la rentabilité par chantier, pilotez votre activité.",
    badge: "Pour les entreprises de plomberie avec équipe",
    monthlyEur: 49,
    yearlyEur: 492,
    popular: false,
    includesLabel: "Tout le plan Pro+, plus :",
    features: [
      "Plusieurs collaborateurs",
      "Suivi chantier avancé",
      "Rentabilité & tableaux de bord",
      "Support prioritaire",
    ],
  },
];

export const DEMO_KPIS = [
  { label: "Devis du mois", value: "12" },
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
    designation: "Plomberie — robinetterie & évacuations",
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
