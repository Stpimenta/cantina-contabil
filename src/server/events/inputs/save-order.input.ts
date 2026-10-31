import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
export const saveOrderInputSchema = z
  .object({
    requestId: z.uuid(),
    catalogVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
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
        (rows) =>
          new Set(rows.map((row) => row.productId)).size === rows.length,
      ),
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
export type SaveOrderInput = z.input<typeof saveOrderInputSchema>;
export type OrderData = z.output<typeof saveOrderInputSchema>;
export function validateSaveOrder(input: unknown) {
  return validateInput(saveOrderInputSchema, input, "INVALID_ORDER_INPUT", {
    customerName: "INVALID_CUSTOMER_NAME",
    note: "NOTE_TOO_LONG",
    items: "INVALID_ORDER_ITEMS",
    total: "INVALID_ORDER_TOTAL",
    cash: "INVALID_ORDER_PAYMENT",
    pix: "INVALID_ORDER_PAYMENT",
  });
}
