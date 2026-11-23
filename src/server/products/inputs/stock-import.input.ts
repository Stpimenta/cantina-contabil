import { z } from "zod";
export const stockImportInputSchema = z.object({
  productId: z.uuid(),
  operationId: z.uuid(),
  sourceCategoryId: z.uuid(),
  sourceProductId: z.uuid(),
  sourceStockId: z.string().min(1).max(100),
  context: z.string().min(2).max(100000),
  expectedQuantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export type StockProductImport = z.output<typeof stockImportInputSchema>;
