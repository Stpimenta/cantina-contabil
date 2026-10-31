import { z } from "zod";

// External transport contract; optional fields keep their existing normalization.
export const userProfileSchema = z.object({
  id: z.number(),
  nome: z
    .string()
    .max(200)
    .refine((value) => value.trim().length > 0),
  email: z.string().max(254),
  data_nascimento: z.unknown().optional(),
  telefone_pais: z.unknown().optional(),
  telefoneNumero: z.unknown().optional(),
});
