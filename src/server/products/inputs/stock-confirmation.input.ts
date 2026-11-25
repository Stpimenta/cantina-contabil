import { z } from "zod";
export const stockConfirmationSchema = z
  .array(
    z.object({
      productId: z.uuid(),
      missing: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      available: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    }),
  )
  .min(1)
  .max(100);
export type StockConfirmation = z.infer<typeof stockConfirmationSchema>;
