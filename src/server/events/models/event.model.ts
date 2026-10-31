import type { EventProduct } from "./event-product.model";
export interface Event {
  id: string;
  cashBoxId: string;
  name: string;
  description: string;
  occursOn: string;
  products: EventProduct[];
  version: number;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  lastOperation: string;
  fingerprint: string;
  realCents: number;
  cashCents: number;
  pixCents: number;
  pendingCents: number;
  soldUnits: number;
  supplyCostCents: number;
}
