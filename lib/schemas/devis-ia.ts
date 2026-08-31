import { z } from "zod";

export const ligneIaSchema = z.object({
  designation: z.string(),
  quantite: z.number(),
  unite: z.string(),
  prix_ht: z.number(),
  tva: z.number(),
  section: z.string().optional().nullable(),
  ligne_type: z.enum(["prestation", "fourniture", "pose"]).optional(),
});

export const clientIaSchema = z
  .object({
    nom: z.string().optional().nullable(),
    prenom: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    tel: z.string().optional().nullable(),
    adresse: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

export const devisIaResponseSchema = z.object({
  lignes: z.array(ligneIaSchema),
  adresse_chantier: z.string().optional().nullable(),
  client: clientIaSchema,
  /** Conditions visibles client (validité, acompte, délais…). */
  notes: z.string().optional().nullable(),
  /** Durée de validité en jours (ex. 30). */
  validite_jours: z.number().optional().nullable(),
  /** Acompte en % (ex. 30). */
  acompte_pourcent: z.number().optional().nullable(),
  /** Date fin validité ISO YYYY-MM-DD si mentionnée explicitement. */
  date_expiration: z.string().optional().nullable(),
});

export type DevisIaClient = z.infer<typeof clientIaSchema>;
export type DevisIaResponse = z.infer<typeof devisIaResponseSchema>;
