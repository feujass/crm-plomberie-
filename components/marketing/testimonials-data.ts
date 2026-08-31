export type Testimonial = {
  id: string;
  displayName: string;
  role: string;
  city: string;
  quote: string;
  highlight?: string;
};

/** Témoignages marketing — remplacer par de vrais verbatims quand disponibles. */
export const TESTIMONIALS: Testimonial[] = [
  {
    id: "beta-lyon-1",
    displayName: "Marc D.",
    role: "Plombier indépendant",
    city: "Lyon",
    quote:
      "J'ai dicté un devis depuis le camion entre deux chantiers. Zeus a structuré les lignes et j'ai envoyé le PDF au client avant de repartir.",
    highlight: "Devis envoyé en moins de 2 minutes",
  },
];
