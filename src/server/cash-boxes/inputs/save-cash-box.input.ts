import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import {
  normalizeName,
  CASH_BOX_NAME_MAX,
  CASH_BOX_DESCRIPTION_MAX,
} from "../models/cash-box-rules";

// Creating and editing share exactly the same editable fields and limits.
export const saveCashBoxInputSchema = z.object({
  name: z
    .string()
    .transform(normalizeName)
    .refine((value) => value.length > 0 && value.length <= CASH_BOX_NAME_MAX),
  description: z
    .string()
    .trim()
    .refine((value) => value.length <= CASH_BOX_DESCRIPTION_MAX),
});
export type SaveCashBoxInput = z.input<typeof saveCashBoxInputSchema>;
export function validateSaveCashBox(input: unknown) {
  return validateInput(
    saveCashBoxInputSchema,
    input,
    "INVALID_CASH_BOX_INPUT",
    { name: "INVALID_CASH_BOX_NAME", description: "DESCRIPTION_TOO_LONG" },
  );
}
