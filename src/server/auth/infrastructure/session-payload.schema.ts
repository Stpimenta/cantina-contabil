import { z } from "zod";
import { allowedRoles } from "../models/role.model";

export const sessionPayloadSchema = z.object({
  version: z.literal(2),
  role: z.enum(allowedRoles),
  issuedAt: z.number().refine(Number.isSafeInteger),
  expiresAt: z.number().refine(Number.isSafeInteger),
  user: z.object({
    id: z.number().positive().refine(Number.isSafeInteger),
    name: z.string().min(1),
    email: z.string(),
    birthDate: z.unknown().optional(),
    phoneCountry: z.unknown().optional(),
    phoneNumber: z.unknown().optional(),
  }),
});
