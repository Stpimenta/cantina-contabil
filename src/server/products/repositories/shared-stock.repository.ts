import type {
  StockMember,
  StockLinkOperation,
  SharedStockHistory,
} from "../models/shared-stock.model";
export interface SharedStockRepository {
  members(categoryId: string, productIds: string[]): Promise<StockMember[]>;
  candidates(query: string): Promise<StockMember[]>;
  findOperation(id: string): Promise<StockLinkOperation | null>;
  saveOperation(operation: StockLinkOperation): Promise<void>;
  history(
    categoryId: string,
    productId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: SharedStockHistory[]; hasMore: boolean }>;
}
