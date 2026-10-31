import { z } from "zod";
import { validateInput } from "@/shared/validation/input";

// Resource identifiers retain their original value; missing resources are handled by the use case.
export const cashBoxIdInputSchema = z.string();
export const cashBoxReferenceInputSchema = z.object({
  id: cashBoxIdInputSchema,
  version: z.number(),
});
export function validateCashBoxId(input: unknown) {
  return validateInput(cashBoxIdInputSchema, input, "INVALID_CASH_BOX_INPUT");
}
export function validateCashBoxReference(input: unknown) {
  return validateInput(
    cashBoxReferenceInputSchema,
    input,
    "INVALID_CASH_BOX_INPUT",
  );
}
