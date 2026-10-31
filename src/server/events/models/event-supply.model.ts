import type { EventSupplyReceipt } from "./event-supply-receipt.model";
import type { ProductIconId } from "@/shared/products/product-icons";
export interface EventSupply {
  id: string;
  eventId: string;
  name: string;
  description: string;
  donorName: string;
  icon: ProductIconId;
  amountCents: number;
  source: "purchase" | "donation";
  cashBoxId: string | null;
  cashBoxName: string | null;
  received: boolean;
  receipts: EventSupplyReceipt[];
  receiptKey: string | null;
  receiptType: string | null;
  version: number;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  fingerprint: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
}
