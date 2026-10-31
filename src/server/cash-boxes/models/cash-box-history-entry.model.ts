import type { CashBoxAudit } from "./cash-box-audit.model";
export type CashBoxHistoryCategory = "all" | "events" | "incoming" | "outgoing";
export interface CashBoxHistoryEntry {
  id: string;
  category: Exclude<CashBoxHistoryCategory, "all">;
  action:
    | CashBoxAudit["action"]
    | "movement_create"
    | "movement_update"
    | "movement_delete"
    | "supply_create"
    | "supply_update"
    | "supply_delete"
    | "donation"
    | "donation_update"
    | "donation_delete"
    | "event_create"
    | "event_delete"
    | "event_update"
    | "order_create"
    | "order_delete"
    | "order_update";
  donationDetails?: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown>;
  };
  movementDetails?: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown>;
  };
  eventDetails?: {
    resourceType: "event" | "order" | "supply";
    before: Record<string, unknown> | null;
    after: Record<string, unknown>;
  };
  actorId: number;
  actorName: string;
  occurredAt: string;
  before: CashBoxAudit["before"];
  after: CashBoxAudit["after"] | null;
  amountCents: number | null;
  donatedOn: string | null;
  donorName: string | null;
  note: string | null;
}
