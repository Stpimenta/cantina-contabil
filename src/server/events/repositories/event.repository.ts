import type { StockLinkOperation } from "@/server/products/models/shared-stock.model";
import type { StockEntry } from "@/server/products/models/stock-entry.model";
import type {
  OrderStatus,
  OrderFulfillmentFilter,
} from "../inputs/event-query.input";
import type { OrderDeletion } from "../models/order-deletion.model";
import type { EventDeletion } from "../models/event-deletion.model";
import type { Event } from "../models/event.model";
import type { EventOrder } from "../models/event-order.model";
import type { EventAudit } from "../models/event-audit.model";
export interface EventPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}
export type EventWriteOutcome =
  | "modality_locked"
  | "delivery_locked"
  | "delivery_disabled"
  | "has_supplies"
  | "has_orders"
  | "saved"
  | "stale"
  | "box_unavailable"
  | "limit"
  | "catalog_changed";
export interface EventReadScope {
  eventIds?: string[];
  cashBoxIds?: string[];
  kind?: "event" | "product_category";
}
export interface EventRepository {
  upcoming(
    today: string,
    scope?: EventReadScope,
  ): Promise<Pick<Event, "id" | "name" | "occursOn">[]>;
  softDeleteOrder(deletion: OrderDeletion): Promise<EventWriteOutcome>;
  softDelete(deletion: EventDeletion): Promise<EventWriteOutcome>;
  cashBoxes(): Promise<{ id: string; name: string }[]>;
  list(
    query: string,
    page: number,
    pageSize: number,
    scope?: EventReadScope,
  ): Promise<EventPage<Event>>;
  find(id: string): Promise<Event | null>;
  hasDeliveryOrders(eventId: string): Promise<boolean>;
  hasOrders(eventId: string): Promise<boolean>;
  create(
    event: Event,
    stockLinks?: StockLinkOperation[],
  ): Promise<EventWriteOutcome>;
  update(
    event: Event,
    expectedVersion: number,
    stockLinks?: StockLinkOperation[],
  ): Promise<EventWriteOutcome>;
  listOrders(
    eventId: string,
    query: string,
    page: number,
    pageSize: number,
    status?: OrderStatus,
    fulfillment?: OrderFulfillmentFilter,
    options?: { range?: { from: string; to: string }; withdrawals?: boolean },
  ): Promise<EventPage<EventOrder>>;
  findOrder(id: string): Promise<EventOrder | null>;
  createOrder(
    order: EventOrder,
    catalogVersion: number,
    additions?: (StockEntry & { expectedAvailable: number })[],
  ): Promise<EventWriteOutcome>;
  orderStockBalances(
    eventId: string,
  ): Promise<{ productId: string; quantity: number; stockId?: string }[]>;
  updateOrder(
    order: EventOrder,
    expectedVersion: number,
    catalogVersion: number,
    additions?: (StockEntry & { expectedAvailable: number })[],
  ): Promise<EventWriteOutcome>;
  soldProducts(
    eventId: string,
  ): Promise<{ id: string; name: string; quantity: number }[]>;
  history(
    eventId: string,
    page: number,
    pageSize: number,
  ): Promise<EventPage<EventAudit>>;
}
