import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
const ids = z
  .array(z.uuid())
  .refine((values) => new Set(values).size === values.length);
const permissions = z
  .object({
    role: z.enum(["admin", "finance", "operator"]),
    cashBoxIds: ids,
    cashBoxWriteIds: ids.default([]),
    eventIds: ids.default([]),
    eventWriteIds: ids.default([]),
  })
  .superRefine((data, context) => {
    for (const [read, write] of [
      ["cashBoxIds", "cashBoxWriteIds"],
      ["eventIds", "eventWriteIds"],
    ] as const) {
      if (data[write].some((id) => !data[read].includes(id)))
        context.addIssue({
          code: "custom",
          path: [write],
          message: "INVALID_ACCOUNT_ACCESS",
        });
    }
  })
  .transform((data) => ({
    ...data,
    cashBoxIds: data.role === "finance" ? data.cashBoxIds : [],
    cashBoxWriteIds: data.role === "finance" ? data.cashBoxWriteIds : [],
    eventIds: data.role === "operator" ? data.eventIds : [],
    eventWriteIds: data.role === "operator" ? data.eventWriteIds : [],
  }));
const issues = {
  role: "INVALID_ACCOUNT_ACCESS",
  cashBoxIds: "INVALID_ACCOUNT_ACCESS",
  cashBoxWriteIds: "INVALID_ACCOUNT_ACCESS",
  eventIds: "INVALID_ACCOUNT_ACCESS",
  eventWriteIds: "INVALID_ACCOUNT_ACCESS",
} as const;
const management = z.intersection(
  permissions,
  z.object({
    id: z.number().int().positive(),
    version: z.number().int().positive(),
    blocked: z.boolean(),
  }),
);
export function validateManageAccount(input: unknown) {
  return validateInput(management, input, "INVALID_ACCOUNT_INPUT", issues);
}
export function validateInviteAccount(input: unknown) {
  return validateInput(
    z.intersection(
      permissions,
      z.object({
        email: z
          .string()
          .trim()
          .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
          .max(254),
      }),
    ),
    input,
    "INVALID_ACCOUNT_INPUT",
    { ...issues, email: "INVALID_EMAIL" },
  );
}
export function validateAccountList(input: unknown) {
  return validateInput(
    z.object({
      query: z
        .string()
        .optional()
        .default("")
        .transform((q) => q.trim().slice(0, 100)),
      page: z.coerce.number().int().positive().catch(1),
    }),
    input,
    "INVALID_ACCOUNT_INPUT",
  );
}
