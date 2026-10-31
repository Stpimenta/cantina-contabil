import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
import { isDateOnly } from "@/shared/dates/date-only";
import { productIcons } from "@/shared/products/product-icons";
const productSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1)
    .refine((v) => v.length <= 100),
  icon: z.enum(productIcons.map((icon) => icon.id)),
  price: moneyInputSchema,
});
export const saveEventInputSchema = z.object({
  requestId: z.uuid(),
  cashBoxId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(1)
    .refine((v) => v.length <= 100),
  description: z
    .string()
    .trim()
    .refine((v) => v.length <= 500),
  occursOn: z.string().refine(isDateOnly),
  products: z
    .array(productSchema)
    .min(1)
    .max(100)
    .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length),
});
export type SaveEventInput = z.input<typeof saveEventInputSchema>;
export type EventData = z.output<typeof saveEventInputSchema>;
export function validateSaveEvent(input: unknown) {
  return validateInput(saveEventInputSchema, input, "INVALID_EVENT_INPUT", {
    cashBoxId: "CASH_BOX_REQUIRED",
    name: "INVALID_EVENT_NAME",
    description: "DESCRIPTION_TOO_LONG",
    occursOn: "INVALID_DATE",
    products: "INVALID_EVENT_PRODUCTS",
  });
}
