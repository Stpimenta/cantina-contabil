import { z } from "zod";
import { brazilianStates } from "../models/brazilian-state.model";
export const viaCepResponseSchema = z.union([
  z.object({ erro: z.union([z.literal(true), z.literal("true")]) }),
  z.object({
    erro: z.literal(false).optional(),
    cep: z.string().regex(/^\d{5}-?\d{3}$/),
    logradouro: z.string().trim().max(100),
    bairro: z.string().trim().max(100),
    localidade: z.string().trim().min(1).max(100),
    uf: z.enum(brazilianStates),
  }),
]);
