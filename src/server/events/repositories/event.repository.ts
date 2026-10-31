import type { OrderStatus } from "../inputs/event-query.input";
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
  | "has_supplies"
  | "has_orders"
  | "saved"
  | "stale"
  | "box_unavailable"
  | "limit"
  | "catalog_changed";
export interface EventRepository {
  upcoming(today: string): Promise<Pick<Event, "id" | "name" | "occursOn">[]>;
  softDeleteOrder(deletion: OrderDeletion): Promise<EventWriteOutcome>;
  softDelete(deletion: EventDeletion): Promise<EventWriteOutcome>;
  cashBoxes(): Promise<{ id: string; name: string }[]>;
  list(
    query: string,
    page: number,
    pageSize: number,
  ): Promise<EventPage<Event>>;
  find(id: string): Promise<Event | null>;
  create(event: Event): Promise<EventWriteOutcome>;
  update(event: Event, expectedVersion: number): Promise<EventWriteOutcome>;
  listOrders(
    eventId: string,
    query: string,
    page: number,
    pageSize: number,
    status?: OrderStatus,
  ): Promise<EventPage<EventOrder>>;
  findOrder(id: string): Promise<EventOrder | null>;
  createOrder(
    order: EventOrder,
    catalogVersion: number,
  ): Promise<EventWriteOutcome>;
  updateOrder(
    order: EventOrder,
    expectedVersion: number,
    catalogVersion: number,
  ): Promise<EventWriteOutcome>;
  history(
    eventId: string,
    page: number,
    pageSize: number,
  ): Promise<EventPage<EventAudit>>;
}
