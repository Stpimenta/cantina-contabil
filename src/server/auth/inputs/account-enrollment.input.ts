import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
const email = z
  .string()
  .trim()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  .max(254);
export function validateAccountEmail(value: unknown) {
  return validateInput(z.object({ email }), value, "INVALID_LOGIN_INPUT", {
    email: "INVALID_EMAIL",
  });
}
export function validateEmailProof(value: unknown) {
  return validateInput(
    z.object({
      tokenHash: z
        .string()
        .min(1)
        .max(2048)
        .regex(/^[A-Za-z0-9_-]+$/),
      type: z.enum(["invite", "recovery"]),
    }),
    value,
    "ACCOUNT_LINK_INVALID",
  );
}
export function validateOwnPassword(value: unknown, requireName = false) {
  return validateInput(
    z
      .object({
        fullName: z.string().trim().min(1).max(200).optional(),
        password: z.string().min(1).max(1024),
        confirmation: z.string(),
      })
      .refine((v) => v.password === v.confirmation, { path: ["confirmation"] })
      .refine((v) => !requireName || !!v.fullName, { path: ["fullName"] }),
    value,
    "INVALID_LOGIN_INPUT",
    {
      fullName: "INVALID_ACCOUNT_NAME",
      password: "INVALID_PASSWORD",
      confirmation: "PASSWORD_MISMATCH",
    },
  );
}
