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

export const devisIaResponseSchema = z.object({
  lignes: z.array(ligneIaSchema),
});

export type DevisIaResponse = z.infer<typeof devisIaResponseSchema>;
