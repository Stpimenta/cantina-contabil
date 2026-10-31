import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { pageInputSchema } from "@/shared/validation/page-input";
import { normalizeName } from "../models/cash-box-rules";

export const listCashBoxesInputSchema = z.object({
  query: z
    .string()
    .default("")
    .transform((value) => normalizeName(value).slice(0, 100)),
  page: pageInputSchema,
});
export type ListCashBoxesInput = z.input<typeof listCashBoxesInputSchema>;
export function validateListCashBoxes(input: unknown) {
  return validateInput(listCashBoxesInputSchema, input, "INVALID_FILTER");
}
