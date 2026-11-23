import type { OrderAddress } from "@/server/events/models/order-address.model";
export interface DeliveryOrder {
  id: string;
  version: number;
  customerName: string;
  note: string;
  address: OrderAddress | null;
  contactPhone: string;
  fulfilled: boolean;
  items: { name: string; quantity: number }[];
  routeId: string | null;
}
