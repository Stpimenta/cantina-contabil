import { z } from "zod";

// Preserve the approved fallback for absent, invalid or out-of-range page numbers.
export const pageInputSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
  .catch(1);
