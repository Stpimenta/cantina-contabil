import type { CashBox } from "./cash-box.model";
export interface CashBoxSummary extends CashBox {
  balanceCents: number;
  pendingCents: number;
}
