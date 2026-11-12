import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
export function validateUpdateOrderStatus(input: unknown, totalCents?: number) {
  return validateInput(
    z
      .object({
        requestId: z.uuid(),
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
      })
      .superRefine((data, ctx) => {
        if (!data.payment && data.fulfilled === undefined)
          ctx.addIssue({ code: "custom", path: ["status"] });
      }),
    input,
    "INVALID_ORDER_INPUT",
    {
      payment: "INVALID_ORDER_PAYMENT",
      fulfilled: "INVALID_FULFILLMENT_STATUS",
      status: "INVALID_ORDER_STATUS",
    },
  );
}
