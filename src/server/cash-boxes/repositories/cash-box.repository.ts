import type { CashBox } from "../models/cash-box.model";
import type { CashBoxSummary } from "../models/cash-box-summary.model";
import type {
  CashBoxHistoryEntry,
  CashBoxHistoryCategory,
} from "../models/cash-box-history-entry.model";

export interface CashBoxList {
  items: CashBoxSummary[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}
export type WriteOutcome = "saved" | "duplicate" | "stale" | "linked";
export interface CashBoxRepository {
  overview(): Promise<CashBoxSummary[]>;
  list(query: string, page: number, pageSize: number): Promise<CashBoxList>;
  find(id: string): Promise<CashBoxSummary | null>;
  create(box: CashBox): Promise<WriteOutcome>;
  update(box: CashBox, expectedVersion: number): Promise<WriteOutcome>;
  softDelete(box: CashBox, expectedVersion: number): Promise<WriteOutcome>;
  history(
    id: string,
    page: number,
    pageSize: number,
    category?: CashBoxHistoryCategory,
  ): Promise<{ items: CashBoxHistoryEntry[]; total: number; page: number }>;
}
