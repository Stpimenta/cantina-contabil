import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
export const sharedStockInputSchema = z
  .object({
    requestId: z.uuid(),
    categoryId: z.uuid(),
    productId: z.uuid(),
    action: z.enum(["link", "unlink"]),
    targetCategoryId: z.uuid().optional(),
    targetProductId: z.uuid().optional(),
    quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    context: z.string().min(2).max(100000),
    expectedQuantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    targetQuantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })
  .refine(
    (v) => v.action !== "link" || !!(v.targetCategoryId && v.targetProductId),
    { path: ["targetProductId"] },
  );
export const validateSharedStock = (input: unknown) =>
  validateInput(sharedStockInputSchema, input, "INVALID_STOCK_INPUT", {
    quantity: "INVALID_AMOUNT",
  });
