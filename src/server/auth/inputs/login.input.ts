import { z } from "zod";
import { validateInput } from "@/shared/validation/input";

export const loginInputSchema = z.object({
  // Preserve the current external login format; never trim or transform the password.
  gmail: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .refine((value) => value.length <= 254),
  senha: z.string().refine((value) => value.length > 0 && value.length <= 1024),
});
export type LoginInput = z.input<typeof loginInputSchema>;
export function validateLogin(input: unknown) {
  return validateInput(loginInputSchema, input, "INVALID_LOGIN_INPUT", {
    gmail: "INVALID_EMAIL",
    senha: "INVALID_PASSWORD",
  });
}
