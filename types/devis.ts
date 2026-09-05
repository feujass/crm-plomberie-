/** Types partagés devis — isolés pour ne pas importer de module `"use server"` côté client. */
export type DevisLigneInput = {
  id?: string;
  section: string | null;
  designation: string;
  quantite: number;
  unite: string;
  prix_ht: number;
  tva: number;
  ordre: number;
  ligne_type: "prestation" | "fourniture" | "pose";
};
