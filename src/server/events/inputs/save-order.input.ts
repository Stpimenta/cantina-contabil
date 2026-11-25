import { stockConfirmationSchema } from "@/server/products/inputs/stock-confirmation.input";
import {
  receiptListSchema,
  RECEIPT_MAX_FILES,
} from "@/shared/receipts/receipt-input";
import { z } from "zod";
import { isDateOnly } from "@/shared/dates/date-only";
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
  pickupOn: z
    .string()
    .refine((v) => !v || isDateOnly(v))
    .default(""),
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
    receipts: receiptListSchema.default([]),
    retainedReceiptIds: z
      .array(z.uuid())
      .max(RECEIPT_MAX_FILES)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
    cash: moneyInputSchema,
    pix: moneyInputSchema,
  })
  .superRefine((data, ctx) => {
    if (
      (data.retainedReceiptIds?.length ?? 0) + data.receipts.length >
      RECEIPT_MAX_FILES
    )
      ctx.addIssue({ code: "custom", path: ["receipts"] });
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
    stockConfirmation: stockConfirmationSchema.optional(),
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
  pickupOn: "INVALID_DATE",
  items: "INVALID_ORDER_ITEMS",
  total: "INVALID_ORDER_TOTAL",
  cash: "INVALID_ORDER_PAYMENT",
  pix: "INVALID_ORDER_PAYMENT",
  receipts: "INVALID_ORDER_RECEIPT",
  retainedReceiptIds: "INVALID_ORDER_RECEIPT",
};
export function validateOrderSection(
  input: unknown,
  section: "details" | "fulfillment" | "payment",
  pickupRequired = false,
) {
  const schema =
    section === "details"
      ? pickupRequired
        ? detailsSchema.refine((data) => !!data.pickupOn, {
            path: ["pickupOn"],
          })
        : detailsSchema
      : section === "payment"
        ? paymentSchema
        : fulfillmentSchema.refine((data) => !!data.fulfillmentMode, {
            path: ["fulfillmentMode"],
          });
  return validateInput(schema, input, "INVALID_ORDER_INPUT", propertyIssues);
}
export function validateSaveOrder(
  input: unknown,
  deliveryEnabled = false,
  pickupRequired = false,
) {
  const result = validateInput(
    saveOrderInputSchema,
    input,
    "INVALID_ORDER_INPUT",
    propertyIssues,
  );
  if (result.ok && pickupRequired && !result.value.pickupOn)
    return {
      ok: false as const,
      error: {
        code: "INVALID_ORDER_INPUT" as const,
        category: "validation" as const,
        issues: { pickupOn: "INVALID_DATE" as const },
      },
    };
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
