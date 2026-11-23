import type { EventProduct } from "@/server/events/models/event-product.model";
export interface StockImportOption {
  sourceCategoryId: string;
  sourceProductId: string;
  sourceStockId: string;
  categoryName: string;
  product: EventProduct;
  context: string;
  quantity: number;
}
