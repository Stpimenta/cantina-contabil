import {
  receiptListSchema,
  RECEIPT_MAX_FILES,
} from "@/shared/receipts/receipt-input";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
export function validateUpdateOrderStatus(input: unknown, totalCents?: number) {
  return validateInput(
    z
      .object({
        requestId: z.uuid(),
        receipts: receiptListSchema.default([]),
        retainedReceiptIds: z
          .array(z.uuid())
          .max(RECEIPT_MAX_FILES)
          .refine((ids) => new Set(ids).size === ids.length)
          .optional(),
        payment: z
          .object({
            method: z.enum(["pix", "cash", "mixed"]),
            cash: moneyInputSchema,
          })
          .superRefine((data, ctx) => {
            if (
              (data.method !== "mixed" && data.cash !== 0) ||
              (data.method === "mixed" &&
                totalCents !== undefined &&
                data.cash > totalCents)
            )
              ctx.addIssue({ code: "custom", path: ["cash"] });
          })
          .optional(),
        fulfilled: z.boolean().optional(),
        stockConfirmation: z
          .array(
            z.object({
              productId: z.uuid(),
              missing: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
              available: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
            }),
          )
          .min(1)
          .max(100)
          .optional(),
      })
      .superRefine((data, ctx) => {
        if (data.stockConfirmation && data.fulfilled !== true)
          ctx.addIssue({ code: "custom", path: ["fulfilled"] });
        if (
          (data.retainedReceiptIds?.length ?? 0) + data.receipts.length >
          RECEIPT_MAX_FILES
        )
          ctx.addIssue({ code: "custom", path: ["receipts"] });
        if (
          !data.payment &&
          data.fulfilled === undefined &&
          !data.receipts.length &&
          data.retainedReceiptIds === undefined
        )
          ctx.addIssue({ code: "custom", path: ["status"] });
      }),
    input,
    "INVALID_ORDER_INPUT",
    {
      payment: "INVALID_ORDER_PAYMENT",
      receipts: "INVALID_ORDER_RECEIPT",
      retainedReceiptIds: "INVALID_ORDER_RECEIPT",
      fulfilled: "INVALID_FULFILLMENT_STATUS",
      status: "INVALID_ORDER_STATUS",
    },
  );
}
