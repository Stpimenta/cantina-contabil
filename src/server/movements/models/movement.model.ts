import type { MovementReceipt } from "./movement-receipt.model";
export interface Movement {
  id: string;
  cashBoxId: string;
  cashBoxName: string;
  direction: "incoming" | "outgoing";
  amountCents: number;
  occurredOn: string;
  reason: string;
  receipts: MovementReceipt[];
  version: number;
  fingerprint: string;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
}
