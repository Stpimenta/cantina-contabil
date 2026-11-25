import { orderStockConsumption } from "@/server/products/models/order-stock";
import type { StockLinkOperation } from "@/server/products/models/shared-stock.model";
import { productStockLinks } from "@/server/products/infrastructure/product-stock-link.schema";
import type { StockEntry } from "@/server/products/models/stock-entry.model";
import { productStockEntries } from "@/server/products/infrastructure/product-stock-entry.schema";
import { throwBusinessError } from "@/shared/errors/business-error";
import { stockShortages } from "@/server/products/models/stock-shortages";
import type {
  OrderStatus,
  OrderFulfillmentFilter,
} from "../inputs/event-query.input";
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
  EventReadScope,
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
  return { ...JSON.parse(payloadJson), ...row, occursOn: row.occursOn ?? "" };
}
function readOrder({
  payloadJson,
  catalogVersion: _catalogVersion,
  ...row
}: OrderRow): EventOrder {
  return {
    fulfillmentMode: null,
    address: null,
    contactPhone: "",
    fulfilled: false,
    receipts: [],
    ...JSON.parse(payloadJson),
    ...row,
  };
}
const eventPayload = (e: Event) =>
  JSON.stringify({
    kind: e.kind ?? "event",
    cashBoxId: e.cashBoxId,
    name: e.name,
    description: e.description,
    occursOn: e.occursOn,
    deliveryEnabled: e.deliveryEnabled,
    canteenEnabled: e.canteenEnabled,
    products: e.products,
  });
const orderPayload = (o: EventOrder) =>
  JSON.stringify({
    ...(o.collected !== undefined ? { collected: o.collected } : {}),
    updatedActor: o.updatedActor,
    ...(o.receipts?.length ? { receipts: o.receipts } : {}),
    ...(o.withdrawals !== undefined
      ? { withdrawals: o.withdrawals, pickupOn: o.pickupOn ?? "" }
      : {}),
    customerName: o.customerName,
    note: o.note,
    fulfillmentMode: o.fulfillmentMode,
    address: o.address,
    contactPhone: o.contactPhone,
    fulfilled: o.fulfilled,
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
function eventScope(scope?: EventReadScope) {
  return scope?.eventIds
    ? sql`${events.id} IN (SELECT value FROM json_each(${JSON.stringify(scope.eventIds)}))`
    : scope?.cashBoxIds
      ? sql`${events.cashBoxId} IN (SELECT value FROM json_each(${JSON.stringify(scope.cashBoxIds)}))`
      : undefined;
}
export class D1EventRepository implements EventRepository {
  async upcoming(today: string, scope?: EventReadScope) {
    return this.db
      .select({
        id: events.id,
        name: events.name,
        occursOn: sql<string>`${events.occursOn}`,
      })
      .from(events)
      .where(
        and(
          isNull(events.deletedAt),
          gte(events.occursOn, today),
          eq(events.kind, "event"),
          eventScope(scope),
        ),
      )
      .orderBy(asc(events.occursOn), asc(events.name), asc(events.id))
      .limit(5)
      .all();
  }
  constructor(
    private readonly db: Database,
    private readonly publications?: import("@/server/canteen/repositories/canteen.repository").PublicationCoordinator,
  ) {}
  private async arm(eventId: string, operation: string) {
    const event = await this.find(eventId);
    if (event?.canteenEnabled) {
      if (!this.publications)
        throw new Error("Canteen publication coordinator required");
      await this.publications.arm(eventId, operation);
    }
  }
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
    attemptedOrder?: EventOrder,
  ): Promise<EventWriteOutcome> {
    try {
      const result = await execute();
      return result.meta.changes > 0 ? "saved" : "stale";
    } catch (cause) {
      if (attemptedOrder && hasDatabaseError(cause, "STOCK_INSUFFICIENT")) {
        const current = await this.findOrder(attemptedOrder.id);
        // A concurrent identical request may have committed before this guard.
        // Let the use case recognize its normal idempotent result.
        if (
          current?.lastOperation === attemptedOrder.lastOperation &&
          current.fingerprint === attemptedOrder.fingerprint &&
          current.updatedBy === attemptedOrder.updatedBy
        )
          return "stale";
        const balances = await this.orderStockBalances(attemptedOrder.eventId);
        const event = await this.find(attemptedOrder.eventId);
        throwBusinessError({
          code: "STOCK_INSUFFICIENT",
          category: "conflict",
          stockShortages: stockShortages(
            attemptedOrder.items,
            orderStockConsumption(
              event ?? { deliveryEnabled: false, canteenEnabled: false },
              attemptedOrder,
            ),
            orderStockConsumption(
              event ?? { deliveryEnabled: false, canteenEnabled: false },
              current,
            ),
            balances,
          ),
        });
      }
      for (const code of [
        "STOCK_CHANGED",
        "DELIVERY_ORDER_ASSIGNED",
        "WITHDRAWAL_ABOVE_ORDERED",
        "STOCK_INSUFFICIENT",
        "ORDER_BELOW_WITHDRAWN",
        "STOCK_PRODUCT_IN_USE",
        "STOCK_HAS_ENTRIES",
        "ORDER_HAS_WITHDRAWALS",
        "INVALID_STOCK_INPUT",
        "STOCK_LIMIT",
      ] as const) {
        if (hasDatabaseError(cause, code))
          throwBusinessError({ code, category: "conflict" });
      }
      if (hasDatabaseError(cause, "TEMP_ACCESS_ENDED"))
        throwBusinessError({
          code: "TEMP_ACCESS_ENDED",
          category: "unauthenticated",
        });
      if (hasDatabaseError(cause, "CANTEEN_PUBLICATION_REQUIRED"))
        throwBusinessError({ code: "EVENT_CHANGED", category: "conflict" });
      if (hasDatabaseError(cause, "EVENT_MODALITY_LOCKED"))
        return "modality_locked";
      if (hasDatabaseError(cause, "EVENT_DELIVERY_LOCKED"))
        return "delivery_locked";
      if (hasDatabaseError(cause, "EVENT_DELIVERY_DISABLED"))
        return "delivery_disabled";
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
  async list(
    query: string,
    page: number,
    pageSize: number,
    scope?: EventReadScope,
  ) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      isNull(events.deletedAt),
      eventScope(scope),
      eq(events.kind, scope?.kind ?? "event"),
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
  async hasOrders(eventId: string) {
    const row = await this.db.get<{ present: number }>(
      sql`SELECT EXISTS(SELECT 1 FROM event_orders WHERE event_id=${eventId}) AS present`,
    );
    return row?.present === 1;
  }
  async hasDeliveryOrders(eventId: string) {
    const row = await this.db.get<{ present: number }>(sql`SELECT EXISTS(
      SELECT 1 FROM event_orders WHERE event_id=${eventId} AND (
        json_extract(payload_json,'$.fulfillmentMode') IS NOT NULL
        OR json_extract(payload_json,'$.address') IS NOT NULL
        OR coalesce(json_extract(payload_json,'$.contactPhone'),'')!=''
        OR coalesce(json_extract(payload_json,'$.fulfilled'),0)!=0
      )) AS present`);
    return row?.present === 1;
  }
  private async catalogBatch(
    execute: () => Promise<{ meta: { changes: number } }[]>,
    event: Event,
  ) {
    try {
      const results = await execute();
      return results[0];
    } catch (cause) {
      if (
        hasDatabaseError(cause, "STOCK_CHANGED") ||
        hasDatabaseError(cause, "INVALID_STOCK_INPUT")
      ) {
        const current = await this.find(event.id);
        if (
          current?.lastOperation === event.lastOperation &&
          current.fingerprint === event.fingerprint &&
          current.updatedBy === event.updatedBy
        )
          return { meta: { changes: 0 } };
      }
      throw cause;
    }
  }
  create(e: Event, stockLinks: StockLinkOperation[] = []) {
    const statement = this.db
      .insert(events)
      .values({
        id: e.id,
        cashBoxId: e.cashBoxId,
        name: e.name,
        description: e.description,
        kind: e.kind ?? "event",
        occursOn: e.kind === "product_category" ? null : e.occursOn,
        deliveryEnabled: e.deliveryEnabled,
        canteenEnabled: e.canteenEnabled,
        ...metadata(e),
        payloadJson: eventPayload(e),
      })
      .onConflictDoNothing({ target: events.id });
    return this.write(() =>
      !stockLinks.length
        ? statement.run()
        : this.catalogBatch(
            () =>
              this.db.batch([
                statement,
                ...stockLinks.map((link) =>
                  this.db.insert(productStockLinks).values(link),
                ),
              ]),
            e,
          ),
    );
  }
  update(e: Event, expected: number, stockLinks: StockLinkOperation[] = []) {
    const statement = this.db
      .update(events)
      .set({
        name: e.name,
        description: e.description,
        kind: e.kind ?? "event",
        occursOn: e.kind === "product_category" ? null : e.occursOn,
        deliveryEnabled: e.deliveryEnabled,
        canteenEnabled: e.canteenEnabled,
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
      );
    return this.write(() =>
      !stockLinks.length
        ? statement.run()
        : this.catalogBatch(
            () =>
              this.db.batch([
                statement,
                ...stockLinks.map((link) =>
                  this.db.insert(productStockLinks).values(link),
                ),
              ]),
            e,
          ),
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
    fulfillment: OrderFulfillmentFilter = "all",
    options?: { range?: { from: string; to: string }; withdrawals?: boolean },
  ) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      eq(eventOrders.eventId, eventId),
      isNull(eventOrders.deletedAt),
      status === "all" ? undefined : eq(eventOrders.paid, status === "paid"),
      fulfillment !== "all"
        ? options?.withdrawals
          ? sql`EXISTS (SELECT 1 FROM json_each(${eventOrders.payloadJson}, '$.items') item WHERE coalesce((SELECT json_extract(w.value, '$.quantity') FROM json_each(${eventOrders.payloadJson}, '$.withdrawals') w WHERE json_extract(w.value, '$.productId') = json_extract(item.value, '$.id')), 0) < json_extract(item.value, '$.quantity')) = ${fulfillment === "pending" ? 1 : 0}`
          : sql`coalesce(json_extract(${eventOrders.payloadJson}, '$.fulfilled'), 0) = ${fulfillment === "completed" ? 1 : 0}`
        : undefined,
      options?.range
        ? sql`json_extract(${eventOrders.payloadJson}, '$.pickupOn') BETWEEN ${options.range.from} AND ${options.range.to}`
        : undefined,
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
        sql`CASE WHEN coalesce(json_extract(${eventOrders.payloadJson}, '$.pickupOn'), '') = '' THEN 1 ELSE 0 END ASC`,
        sql`json_extract(${eventOrders.payloadJson}, '$.pickupOn') ASC`,
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
  async createOrder(
    o: EventOrder,
    catalogVersion: number,
    additions?: (StockEntry & { expectedAvailable: number })[],
  ) {
    await this.arm(o.eventId, o.lastOperation);
    return this.write(async () => {
      const insert = this.db
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
          stockContext: o.stockContext ?? null,
        })
        .onConflictDoNothing({ target: eventOrders.id });
      if (!additions?.length) return insert.run();
      const entries = additions.map(({ expectedAvailable, ...entry }) =>
        this.db.insert(productStockEntries).values({
          ...entry,
          quantity: sql`CASE WHEN NOT EXISTS(SELECT 1 FROM event_orders WHERE id=${o.id})
            AND coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=${o.eventId} AND product_id=${entry.productId}),0)=${expectedAvailable}
            THEN ${entry.quantity} ELSE 0 END`,
        }),
      );
      const [first, ...rest] = entries;
      try {
        const results = await this.db.batch([first!, ...rest, insert]);
        return results[results.length - 1];
      } catch (cause) {
        const current = await this.findOrder(o.id);
        if (
          current?.lastOperation === o.lastOperation &&
          current.fingerprint === o.fingerprint &&
          current.updatedBy === o.updatedBy
        )
          return { meta: { changes: 0 } };
        if (hasDatabaseError(cause, "INVALID_STOCK_INPUT"))
          throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
        throw cause;
      }
    }, o);
  }
  async orderStockBalances(eventId: string) {
    const rows = await this.db.all<{
      productId: string;
      quantity: number;
      stockId: string | null;
    }>(
      sql`SELECT product_id AS productId, quantity,CASE WHEN (SELECT count(*) FROM product_stock_members m WHERE m.stock_id=product_stock_balances.stock_id)>1 THEN stock_id END AS stockId FROM product_stock_balances WHERE event_id=${eventId}`,
    );
    if (
      rows.some(
        (row) => !Number.isSafeInteger(row.quantity) || row.quantity < 0,
      )
    )
      throw new Error("Invalid product stock balance");
    return rows.map(({ stockId, ...row }) =>
      stockId ? { ...row, stockId } : row,
    );
  }
  async updateOrder(
    o: EventOrder,
    expected: number,
    catalogVersion: number,
    additions?: (StockEntry & { expectedAvailable: number })[],
  ) {
    await this.arm(o.eventId, o.lastOperation);
    return this.write(async () => {
      const update = this.db
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
          stockContext: o.stockContext ?? null,
        })
        .where(
          and(
            eq(eventOrders.id, o.id),
            eq(eventOrders.version, expected),
            isNull(eventOrders.deletedAt),
          ),
        );
      if (!additions?.length) return update.run();
      const inserts = additions.map(({ expectedAvailable, ...entry }) =>
        this.db.insert(productStockEntries).values({
          ...entry,
          quantity: sql`CASE WHEN EXISTS(SELECT 1 FROM event_orders WHERE id=${o.id} AND version=${expected} AND deleted_at IS NULL)
            AND coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=${o.eventId} AND product_id=${entry.productId}),0)=${expectedAvailable}
            THEN ${entry.quantity} ELSE 0 END`,
        }),
      );
      const [first, ...rest] = inserts;
      try {
        const results = await this.db.batch([first!, ...rest, update]);
        return results[results.length - 1];
      } catch (cause) {
        const current = await this.findOrder(o.id);
        if (
          current?.lastOperation === o.lastOperation &&
          current.fingerprint === o.fingerprint &&
          current.updatedBy === o.updatedBy
        )
          return { meta: { changes: 0 } };
        if (hasDatabaseError(cause, "INVALID_STOCK_INPUT"))
          throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
        throw cause;
      }
    }, o);
  }
  async softDeleteOrder(deletion: OrderDeletion) {
    const operation = crypto.randomUUID();
    await this.arm(deletion.eventId, operation);
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
          lastOperation: operation,
          version: sql`${eventOrders.version} + 1`,
          payloadJson: sql`json_set(json_remove(${eventOrders.payloadJson}, '$.updatedActor'), '$.deletedAt', ${deletion.deletedAt}, '$.deletedBy', ${deletion.deletedBy}, '$.deletedByName', ${deletion.deletedByName})`,
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
  async soldProducts(eventId: string) {
    return this.db.all<{ id: string; name: string; quantity: number }>(sql`
      SELECT json_extract(item.value, '$.id') AS id,
        max(json_extract(item.value, '$.name')) AS name,
        sum(json_extract(item.value, '$.quantity')) AS quantity
      FROM event_orders o, json_each(o.payload_json, '$.items') item
      WHERE o.event_id = ${eventId} AND o.deleted_at IS NULL
      GROUP BY json_extract(item.value, '$.id')
    `);
  }
  async history(eventId: string, page: number, pageSize: number) {
    const source = sql`SELECT id,event_id AS eventId,resource_id AS resourceId,resource_type AS resourceType,action,actor_id AS actorId,actor_name AS actorName,occurred_at AS occurredAt,before_json AS beforeJson,after_json AS afterJson FROM event_audit WHERE event_id=${eventId}
      UNION ALL SELECT id,event_id,supply_id,'supply',action,actor_id,actor_name,occurred_at,json_remove(before_json,'$.receiptKey','$.receipts'),json_remove(after_json,'$.receiptKey','$.receipts') FROM event_supply_audit WHERE event_id=${eventId}
      UNION ALL SELECT id,event_id,entry_id,'stock',action,actor_id,actor_name,occurred_at,before_json,after_json FROM product_stock_audit WHERE event_id=${eventId}`;
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
