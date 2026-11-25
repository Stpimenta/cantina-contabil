import type { StockPosition } from "../models/stock-position.model";
import type { StockEntryCursor } from "../models/stock-entry-cursor.model";
import type { StockEntry } from "../models/stock-entry.model";
import type { EventPage } from "@/server/events/repositories/event.repository";
export interface ProductStockRepository {
  positions(
    categoryId: string,
    range?: { from: string; to: string },
  ): Promise<StockPosition[]>;
  productionDemand(
    categoryId: string,
    range?: { from: string; to: string },
  ): Promise<
    {
      productId: string;
      name: string;
      pending: number;
      allPending: number;
      available: number;
    }[]
  >;
  entriesBefore(
    categoryId: string,
    productId: string,
    cursor: StockEntryCursor | null,
    limit: number,
  ): Promise<StockEntry[]>;
  productInUse(categoryId: string, productId: string): Promise<boolean>;
  balances(
    categoryId: string,
  ): Promise<{ productId: string; quantity: number; stockId?: string }[]>;
  entries(
    categoryId: string,
    productId: string,
    page: number,
    pageSize: number,
  ): Promise<EventPage<StockEntry>>;
  findEntry(id: string): Promise<StockEntry | null>;
  saveEntry(entry: StockEntry, expectedVersion: number): Promise<boolean>;
  saveEntries(entries: StockEntry[], addition?: StockEntry): Promise<void>;
}
