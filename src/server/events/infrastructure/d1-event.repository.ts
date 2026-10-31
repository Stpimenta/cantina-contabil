import type { OrderStatus } from "../inputs/event-query.input";
import type { OrderDeletion } from "../models/order-deletion.model";
import type { EventDeletion } from "../models/event-deletion.model";
import {
  and,
  gte,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
  sql,
} from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import type {
  EventRepository,
  EventWriteOutcome,
} from "../repositories/event.repository";
import type { Event } from "../models/event.model";
import type { EventOrder } from "../models/event-order.model";
import type { EventAudit } from "../models/event-audit.model";
import { events } from "./event.schema";
import { eventOrders } from "./event-order.schema";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";
const sums = {
  supplyCostCents: sql<number>`coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE event_id=events.id AND source='purchase' AND deleted_at IS NULL),0)`,
  cashCents: sql<number>`coalesce((SELECT sum(json_extract(payload_json,'$.cashCents')) FROM event_orders WHERE event_id=events.id AND deleted_at IS NULL AND paid=1),0)`,
  pixCents: sql<number>`coalesce((SELECT sum(json_extract(payload_json,'$.pixCents')) FROM event_orders WHERE event_id=events.id AND deleted_at IS NULL AND paid=1),0)`,
  soldUnits: sql<number>`coalesce((SELECT sum(i.quantity) FROM event_order_items i JOIN event_orders o ON o.id=i.order_id AND o.version=i.version WHERE o.event_id=events.id AND o.deleted_at IS NULL),0)`,
  realCents: sql<number>`coalesce((SELECT sum(total_cents) FROM event_orders WHERE event_id=events.id AND deleted_at IS NULL AND paid=1),0)`,
  pendingCents: sql<number>`coalesce((SELECT sum(total_cents) FROM event_orders WHERE event_id=events.id AND deleted_at IS NULL AND paid=0),0)`,
};
type EventRow = typeof events.$inferSelect & {
  soldUnits: number;
  supplyCostCents: number;
  realCents: number;
  cashCents: number;
  pixCents: number;
  pendingCents: number;
};
type OrderRow = typeof eventOrders.$inferSelect;
function readEvent({ payloadJson, ...row }: EventRow): Event {
  if (
    !Number.isSafeInteger(row.supplyCostCents) ||
    !Number.isSafeInteger(row.soldUnits) ||
    !Number.isSafeInteger(row.realCents) ||
    !Number.isSafeInteger(row.cashCents) ||
    !Number.isSafeInteger(row.pixCents) ||
    !Number.isSafeInteger(row.pendingCents)
  )
    throw new Error("Saldo fora da precisão segura");
  return { ...JSON.parse(payloadJson), ...row };
}
function readOrder({
  payloadJson,
  catalogVersion: _catalogVersion,
  ...row
}: OrderRow): EventOrder {
  return { ...JSON.parse(payloadJson), ...row };
}
const eventPayload = (e: Event) =>
  JSON.stringify({
    cashBoxId: e.cashBoxId,
    name: e.name,
    description: e.description,
    occursOn: e.occursOn,
    products: e.products,
  });
const orderPayload = (o: EventOrder) =>
  JSON.stringify({
    customerName: o.customerName,
    note: o.note,
    items: o.items,
    totalCents: o.totalCents,
    paid: o.paid,
    cashCents: o.cashCents,
    pixCents: o.pixCents,
  });
function metadata(v: Event | EventOrder) {
  return {
    version: v.version,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
    createdByName: v.createdByName,
    updatedAt: v.updatedAt,
    updatedBy: v.updatedBy,
    updatedByName: v.updatedByName,
    lastOperation: v.lastOperation,
    fingerprint: v.fingerprint,
  };
}
export class D1EventRepository implements EventRepository {
  async upcoming(today: string) {
    return this.db
      .select({ id: events.id, name: events.name, occursOn: events.occursOn })
      .from(events)
      .where(and(isNull(events.deletedAt), gte(events.occursOn, today)))
      .orderBy(asc(events.occursOn), asc(events.name), asc(events.id))
      .limit(5)
      .all();
  }
  constructor(private readonly db: Database) {}
  async cashBoxes() {
    return this.db
      .select({ id: cashBoxes.id, name: cashBoxes.name })
      .from(cashBoxes)
      .where(isNull(cashBoxes.deletedAt))
      .orderBy(asc(cashBoxes.nameKey), asc(cashBoxes.id))
      .all();
  }

  private async write(
    execute: () => Promise<{ meta: { changes: number } }>,
  ): Promise<EventWriteOutcome> {
    try {
      const result = await execute();
      return result.meta.changes > 0 ? "saved" : "stale";
    } catch (cause) {
      if (hasDatabaseError(cause, "EVENT_HAS_SUPPLIES")) return "has_supplies";
      if (hasDatabaseError(cause, "EVENT_HAS_ORDERS")) return "has_orders";
      if (hasDatabaseError(cause, "EVENT_BOX_UNAVAILABLE"))
        return "box_unavailable";
      if (hasDatabaseError(cause, "EVENT_CATALOG_CHANGED"))
        return "catalog_changed";
      if (hasDatabaseError(cause, "EVENT_AMOUNT_LIMIT")) return "limit";
      throw cause;
    }
  }
  async list(query: string, page: number, pageSize: number) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      isNull(events.deletedAt),
      sql`${events.name} LIKE ${search} ESCAPE '!'`,
    );
    const result = await this.db
      .select({ total: count() })
      .from(events)
      .where(condition)
      .get();
    const total = result?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await this.db
      .select({ ...getTableColumns(events), ...sums })
      .from(events)
      .where(condition)
      .orderBy(desc(events.occursOn), desc(events.id))
      .limit(pageSize)
      .offset((current - 1) * pageSize)
      .all();
    return {
      items: rows.map(readEvent),
      total,
      page: current,
      pageSize,
      query,
    };
  }
  async find(id: string) {
    const row = await this.db
      .select({ ...getTableColumns(events), ...sums })
      .from(events)
      .where(and(eq(events.id, id), isNull(events.deletedAt)))
      .get();
    return row ? readEvent(row) : null;
  }
  create(e: Event) {
    return this.write(() =>
      this.db
        .insert(events)
        .values({
          id: e.id,
          cashBoxId: e.cashBoxId,
          name: e.name,
          description: e.description,
          occursOn: e.occursOn,
          ...metadata(e),
          payloadJson: eventPayload(e),
        })
        .onConflictDoNothing({ target: events.id })
        .run(),
    );
  }
  update(e: Event, expected: number) {
    return this.write(() =>
      this.db
        .update(events)
        .set({
          name: e.name,
          description: e.description,
          occursOn: e.occursOn,
          version: e.version,
          updatedAt: e.updatedAt,
          updatedBy: e.updatedBy,
          updatedByName: e.updatedByName,
          lastOperation: e.lastOperation,
          fingerprint: e.fingerprint,
          payloadJson: eventPayload(e),
        })
        .where(
          and(
            eq(events.id, e.id),
            eq(events.version, expected),
            isNull(events.deletedAt),
          ),
        )
        .run(),
    );
  }
  softDelete(deletion: EventDeletion) {
    return this.write(() =>
      this.db
        .update(events)
        .set({
          deletedAt: deletion.deletedAt,
          deletedBy: deletion.deletedBy,
          deletedByName: deletion.deletedByName,
          updatedAt: deletion.deletedAt,
          updatedBy: deletion.deletedBy,
          updatedByName: deletion.deletedByName,
          version: sql`${events.version} + 1`,
          payloadJson: sql`json_set(${events.payloadJson}, '$.deletedAt', ${deletion.deletedAt}, '$.deletedBy', ${deletion.deletedBy}, '$.deletedByName', ${deletion.deletedByName})`,
        })
        .where(
          and(
            eq(events.id, deletion.id),
            eq(events.version, deletion.expectedVersion),
            isNull(events.deletedAt),
          ),
        )
        .run(),
    );
  }
  async listOrders(
    eventId: string,
    query: string,
    page: number,
    pageSize: number,
    status: OrderStatus = "all",
  ) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      eq(eventOrders.eventId, eventId),
      isNull(eventOrders.deletedAt),
      status === "all" ? undefined : eq(eventOrders.paid, status === "paid"),
      sql`${eventOrders.customerName} LIKE ${search} ESCAPE '!'`,
    );
    const result = await this.db
      .select({ total: count() })
      .from(eventOrders)
      .where(condition)
      .get();
    const total = result?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await this.db
      .select()
      .from(eventOrders)
      .where(condition)
      .orderBy(
        sql`${eventOrders.customerName} COLLATE NOCASE ASC`,
        desc(eventOrders.createdAt),
        desc(eventOrders.id),
      )
      .limit(pageSize)
      .offset((current - 1) * pageSize)
      .all();
    return {
      items: rows.map(readOrder),
      total,
      page: current,
      pageSize,
      query,
    };
  }
  async findOrder(id: string) {
    const row = await this.db
      .select()
      .from(eventOrders)
      .where(and(eq(eventOrders.id, id), isNull(eventOrders.deletedAt)))
      .get();
    return row ? readOrder(row) : null;
  }
  createOrder(o: EventOrder, catalogVersion: number) {
    return this.write(() =>
      this.db
        .insert(eventOrders)
        .values({
          id: o.id,
          eventId: o.eventId,
          customerName: o.customerName,
          note: o.note,
          totalCents: o.totalCents,
          paid: o.paid,
          catalogVersion,
          ...metadata(o),
          payloadJson: orderPayload(o),
        })
        .onConflictDoNothing({ target: eventOrders.id })
        .run(),
    );
  }
  updateOrder(o: EventOrder, expected: number, catalogVersion: number) {
    return this.write(() =>
      this.db
        .update(eventOrders)
        .set({
          customerName: o.customerName,
          note: o.note,
          totalCents: o.totalCents,
          paid: o.paid,
          catalogVersion,
          version: o.version,
          updatedAt: o.updatedAt,
          updatedBy: o.updatedBy,
          updatedByName: o.updatedByName,
          lastOperation: o.lastOperation,
          fingerprint: o.fingerprint,
          payloadJson: orderPayload(o),
        })
        .where(
          and(
            eq(eventOrders.id, o.id),
            eq(eventOrders.version, expected),
            isNull(eventOrders.deletedAt),
          ),
        )
        .run(),
    );
  }
  softDeleteOrder(deletion: OrderDeletion) {
    return this.write(() =>
      this.db
        .update(eventOrders)
        .set({
          deletedAt: deletion.deletedAt,
          deletedBy: deletion.deletedBy,
          deletedByName: deletion.deletedByName,
          updatedAt: deletion.deletedAt,
          updatedBy: deletion.deletedBy,
          updatedByName: deletion.deletedByName,
          catalogVersion: deletion.catalogVersion,
          version: sql`${eventOrders.version} + 1`,
          payloadJson: sql`json_set(${eventOrders.payloadJson}, '$.deletedAt', ${deletion.deletedAt}, '$.deletedBy', ${deletion.deletedBy}, '$.deletedByName', ${deletion.deletedByName})`,
        })
        .where(
          and(
            eq(eventOrders.id, deletion.id),
            eq(eventOrders.eventId, deletion.eventId),
            eq(eventOrders.version, deletion.expectedVersion),
            isNull(eventOrders.deletedAt),
          ),
        )
        .run(),
    );
  }
  async history(eventId: string, page: number, pageSize: number) {
    const source = sql`SELECT id,event_id AS eventId,resource_id AS resourceId,resource_type AS resourceType,action,actor_id AS actorId,actor_name AS actorName,occurred_at AS occurredAt,before_json AS beforeJson,after_json AS afterJson FROM event_audit WHERE event_id=${eventId}
      UNION ALL SELECT id,event_id,supply_id,'supply',action,actor_id,actor_name,occurred_at,json_remove(before_json,'$.receiptKey','$.receipts'),json_remove(after_json,'$.receiptKey','$.receipts') FROM event_supply_audit WHERE event_id=${eventId}`;
    const total =
      (
        await this.db.get<{ total: number }>(
          sql`SELECT count(*) AS total FROM (${source})`,
        )
      )?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await this.db.all<
      Omit<EventAudit, "before" | "after"> & {
        beforeJson: string | null;
        afterJson: string;
      }
    >(
      sql`SELECT * FROM (${source}) ORDER BY occurredAt DESC,id DESC LIMIT ${pageSize} OFFSET ${(current - 1) * pageSize}`,
    );
    const items: EventAudit[] = rows.map(
      ({ beforeJson, afterJson, ...row }) => ({
        ...row,
        before: beforeJson ? JSON.parse(beforeJson) : null,
        after: JSON.parse(afterJson),
      }),
    );
    return { items, total, page: current, pageSize, query: "" };
  }
}
