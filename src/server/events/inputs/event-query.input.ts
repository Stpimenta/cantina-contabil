import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { pageInputSchema } from "@/shared/validation/page-input";
const listSchema = z.object({
  query: z
    .string()
    .default("")
    .transform((v) => v.trim().slice(0, 100)),
  page: pageInputSchema,
});
export const validateEventQuery = (input: unknown) =>
  validateInput(listSchema, input, "INVALID_EVENT_INPUT");
export const validateEventId = (input: unknown) =>
  validateInput(z.uuid(), input, "EVENT_NOT_FOUND");
export const validateEventVersion = (input: unknown) =>
  validateInput(
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    input,
    "EVENT_CHANGED",
  );

export const orderStatusSchema = z
  .enum(["all", "pending", "paid"])
  .catch("all");
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export const validateOrderQuery = (input: unknown) =>
  validateInput(
    listSchema.extend({ status: orderStatusSchema }),
    input,
    "INVALID_EVENT_INPUT",
  );
