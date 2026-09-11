export type Testimonial = {
  id: string;
  displayName: string;
  role: string;
  city: string;
  quote: string;
  highlight?: string;
};

/** Témoignages marketing — remplacer par de vrais verbatims quand disponibles. */
export const TESTIMONIALS: Testimonial[] = [];
