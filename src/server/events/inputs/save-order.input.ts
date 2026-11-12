import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import type { ValidationIssue } from "@/shared/errors/business-failure";
import { moneyInputSchema } from "@/shared/validation/money-input";
import { orderAddressSchema, contactPhoneSchema } from "./order-delivery.input";

const detailsSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1)
    .refine((v) => v.length <= 100),
  note: z
    .string()
    .trim()
    .refine((v) => v.length <= 500),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (rows) => new Set(rows.map((row) => row.productId)).size === rows.length,
    ),
});
const fulfillmentSchema = z
  .object({
    fulfillmentMode: z.enum(["delivery", "pickup"]).nullable().default(null),
    address: orderAddressSchema.nullable().default(null),
    contactPhone: contactPhoneSchema.default(""),
    fulfilled: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMode !== "delivery" && data.address)
      ctx.addIssue({ code: "custom", path: ["address"] });
    if (!data.fulfillmentMode && (data.fulfilled || data.contactPhone))
      ctx.addIssue({ code: "custom", path: ["fulfillmentMode"] });
  });
const paymentSchema = z
  .object({
    total: moneyInputSchema,
    paid: z.boolean(),
    cash: moneyInputSchema,
    pix: moneyInputSchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.paid
        ? BigInt(data.cash) + BigInt(data.pix) !== BigInt(data.total)
        : data.cash !== 0 || data.pix !== 0
    )
      ctx.addIssue({ code: "custom", path: ["cash"] });
  });
export const saveOrderInputSchema = z
  .object({
    requestId: z.uuid(),
    catalogVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .and(detailsSchema)
  .and(fulfillmentSchema)
  .and(paymentSchema);
export type SaveOrderInput = z.input<typeof saveOrderInputSchema>;
export type OrderData = z.output<typeof saveOrderInputSchema>;
const propertyIssues: Record<string, ValidationIssue> = {
  fulfillmentMode: "INVALID_FULFILLMENT_MODE",
  address: "INVALID_ORDER_ADDRESS",
  contactPhone: "INVALID_CONTACT_PHONE",
  fulfilled: "INVALID_FULFILLMENT_STATUS",
  customerName: "INVALID_CUSTOMER_NAME",
  note: "NOTE_TOO_LONG",
  items: "INVALID_ORDER_ITEMS",
  total: "INVALID_ORDER_TOTAL",
  cash: "INVALID_ORDER_PAYMENT",
  pix: "INVALID_ORDER_PAYMENT",
};
export function validateOrderSection(
  input: unknown,
  section: "details" | "fulfillment" | "payment",
) {
  const schema =
    section === "details"
      ? detailsSchema
      : section === "payment"
        ? paymentSchema
        : fulfillmentSchema.refine((data) => !!data.fulfillmentMode, {
            path: ["fulfillmentMode"],
          });
  return validateInput(schema, input, "INVALID_ORDER_INPUT", propertyIssues);
}
export function validateSaveOrder(input: unknown, deliveryEnabled = false) {
  const result = validateInput(
    saveOrderInputSchema,
    input,
    "INVALID_ORDER_INPUT",
    propertyIssues,
  );
  if (result.ok && deliveryEnabled && !result.value.fulfillmentMode)
    return {
      ok: false as const,
      error: {
        code: "INVALID_ORDER_INPUT" as const,
        category: "validation" as const,
        issues: { fulfillmentMode: "INVALID_FULFILLMENT_MODE" as const },
      },
    };
  return result;
}
