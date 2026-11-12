import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}-?\d{3}$/);
const lookupPostalCodeSchema = z.object({
  postalCode: postalCodeSchema.transform((value) => value.replace("-", "")),
});
export type LookupPostalCodeInput = z.input<typeof lookupPostalCodeSchema>;
export type LookupPostalCodeData = z.output<typeof lookupPostalCodeSchema>;
export function validateLookupPostalCode(input: unknown) {
  return validateInput(
    lookupPostalCodeSchema,
    input,
    "INVALID_POSTAL_CODE_INPUT",
    {
      postalCode: "INVALID_POSTAL_CODE",
    },
  );
}
