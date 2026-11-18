import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
const quantity = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const stockEntryInputSchema = z
  .object({
    requestId: z.uuid(),
    categoryId: z.uuid(),
    productId: z.uuid(),
    entryId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    quantity,
  })
  .refine((v) => v.expectedVersion > 0 || v.quantity > 0, {
    path: ["quantity"],
  })
  .refine((v) => v.expectedVersion > 0 || v.entryId === v.requestId, {
    path: ["requestId"],
  });
export const validateStockEntry = (input: unknown) =>
  validateInput(stockEntryInputSchema, input, "INVALID_STOCK_INPUT", {
    quantity: "INVALID_AMOUNT",
  });
export const withdrawalInputSchema = z.object({
  requestId: z.uuid(),
  categoryId: z.uuid(),
  orderId: z.uuid(),
  expectedVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  withdrawals: z
    .array(z.object({ productId: z.uuid(), quantity }))
    .min(1)
    .max(100)
    .refine(
      (rows) => new Set(rows.map((r) => r.productId)).size === rows.length,
    ),
});
export function validateWithdrawal(input: unknown) {
  const result = validateInput(
    withdrawalInputSchema,
    input,
    "INVALID_STOCK_INPUT",
    { withdrawals: "INVALID_ORDER_ITEMS" },
  );
  if (!result.ok && result.error.issues) {
    for (const property of Object.keys(result.error.issues))
      if (/^withdrawals\.\d+\.quantity$/.test(property))
        result.error.issues[property] = "INVALID_AMOUNT";
  }
  return result;
}

export const deleteStockEntryInputSchema = z.object({
  requestId: z.uuid(),
  categoryId: z.uuid(),
  productId: z.uuid(),
  entryId: z.uuid(),
  expectedVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export const validateDeleteStockEntry = (input: unknown) =>
  validateInput(deleteStockEntryInputSchema, input, "INVALID_STOCK_INPUT");

export const updateStockEntriesInputSchema = z
  .object({
    addition: z
      .object({
        entryId: z.uuid(),
        quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      })
      .optional(),
    requestId: z.uuid(),
    categoryId: z.uuid(),
    productId: z.uuid(),
    entries: z
      .array(
        z.object({
          entryId: z.uuid(),
          expectedVersion: z
            .number()
            .int()
            .positive()
            .max(Number.MAX_SAFE_INTEGER),
          quantity,
        }),
      )
      .min(1)
      .max(DEFAULT_PAGE_SIZE)
      .refine(
        (rows) => new Set(rows.map((r) => r.entryId)).size === rows.length,
      ),
  })
  .refine(
    (v) =>
      !v.addition ||
      (v.addition.entryId === v.requestId &&
        !v.entries.some((entry) => entry.entryId === v.addition!.entryId)),
    { path: ["addition"] },
  );
export function validateUpdateStockEntries(input: unknown) {
  const result = validateInput(
    updateStockEntriesInputSchema,
    input,
    "INVALID_STOCK_INPUT",
    { entries: "INVALID_AMOUNT", addition: "INVALID_AMOUNT" },
  );
  return result;
}

export const validateStockEntryCursor = (input: unknown) =>
  validateInput(z.object({ createdAt: z.iso.datetime(), id: z.uuid() }).nullable(), input, "INVALID_STOCK_INPUT");
