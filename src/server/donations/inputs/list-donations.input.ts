import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { pageInputSchema } from "@/shared/validation/page-input";

export const listDonationsInputSchema = z.object({
  query: z
    .string()
    .default("")
    .transform((value) => value.trim().slice(0, 100)),
  cashBoxId: z.string().trim().default(""),
  year: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine(
      (value) =>
        value === null ||
        (Number.isSafeInteger(value) && value >= 1 && value <= 9999),
    ),
  page: pageInputSchema,
});
export type ListDonationsInput = z.input<typeof listDonationsInputSchema>;
export function validateListDonations(input: unknown) {
  return validateInput(listDonationsInputSchema, input, "INVALID_FILTER");
}
