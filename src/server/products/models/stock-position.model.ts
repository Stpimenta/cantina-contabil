import type { StockMember } from "./shared-stock.model";

// Physical quantity, membership and demand from the same database statement.
export interface StockPosition extends StockMember {
  pending: number;
  allPending: number;
}
