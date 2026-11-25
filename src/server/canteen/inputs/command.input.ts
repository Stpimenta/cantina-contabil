import { stockConfirmationSchema } from "@/server/products/inputs/stock-confirmation.input";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
export const commandIdSchema = z.uuid();
export const commandQuerySchema = z.object({
  q: z
    .string()
    .catch("")
    .transform((v) => v.trim().slice(0, 100)),
  page: z.coerce.number().int().positive().catch(1),
  collected: z.enum(["all", "waiting", "collected"]).catch("all"),
});
export const collectCommandSchema = z.object({
  requestId: z.uuid(),
  version: z.number().int().positive(),
  collected: z.boolean(),
  stockConfirmation: stockConfirmationSchema.optional(),
});
export const temporaryAccessSchema = z.object({
  requestId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  expiresAt: z
    .number()
    .int()
    .positive()
    .refine((v) => v > Math.floor(Date.now() / 1000)),
});
export const validateCommandId = (v: unknown) =>
  validateInput(commandIdSchema, v, "INVALID_ORDER_INPUT", {});
export const validateCommandQuery = (v: unknown) =>
  validateInput(commandQuerySchema, v, "INVALID_ORDER_INPUT", {});
export const validateCollectCommand = (v: unknown) =>
  validateInput(collectCommandSchema, v, "INVALID_ORDER_INPUT", {});
export const validateTemporaryAccess = (v: unknown) =>
  validateInput(temporaryAccessSchema, v, "INVALID_TEMP_ACCESS", {
    name: "INVALID_ACCESS_NAME",
    expiresAt: "INVALID_ACCESS_EXPIRY",
  });
export const credentialSchema = z.string().regex(/^[a-f0-9]{64}$/);
