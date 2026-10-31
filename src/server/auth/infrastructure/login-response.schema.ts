import { z } from "zod";

export const loginResponseSchema = z.object({
  status: z.boolean(),
  jwtToken: z.unknown().optional(),
});
export const loginTokenSchema = z.string().min(1);
