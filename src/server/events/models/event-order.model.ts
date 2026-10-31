import type { OrderItem } from "./order-item.model";
export interface EventOrder {
  id: string;
  eventId: string;
  customerName: string;
  note: string;
  items: OrderItem[];
  totalCents: number;
  paid: boolean;
  cashCents: number;
  pixCents: number;
  version: number;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  lastOperation: string;
  fingerprint: string;
}
