/** Types partagés devis — isolés pour ne pas importer de module `"use server"` côté client. */
export type OriginePrix = "dicte" | "prereglage" | "vide";

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
  /** Extrait de la dictée justifiant la ligne */
  source?: string | null;
  origine_prix?: OriginePrix | null;
  /** Alerte TVA non bloquante */
  tva_alerte?: string | null;
};
