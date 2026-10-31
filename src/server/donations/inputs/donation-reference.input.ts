import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
export const validateDonationReference = (input: unknown) =>
  validateInput(
    z.object({
      id: z.uuid(),
      version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
    input,
    "DONATION_CHANGED",
  );
