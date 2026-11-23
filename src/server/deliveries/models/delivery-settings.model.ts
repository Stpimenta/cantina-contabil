import type { OrderAddress } from "@/server/events/models/order-address.model";
export interface DeliverySettings {
  eventId: string;
  origin: OrderAddress;
  driverIds: string[];
  version: number;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  lastOperation: string;
  fingerprint: string;
}
