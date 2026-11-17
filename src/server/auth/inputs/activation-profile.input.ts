import {
  normalizeBirthDate,
  normalizePhoneField,
} from "@/server/users/models/profile-details";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";

const activationProfileSchema = z.object({
  birthDate: z.unknown().transform(normalizeBirthDate),
  phoneCountry: z.unknown().transform(normalizePhoneField),
  phoneNumber: z.unknown().transform(normalizePhoneField),
  id: z.number().int().positive().max(2147483647),
  name: z.string().trim().min(1).max(200),
  email: z.email().max(254),
});

export function validateActivationProfile(input: unknown) {
  return validateInput(activationProfileSchema, input, "INVALID_AUTH_RESPONSE");
}
