import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import { throwBusinessError } from "@/shared/errors/business-error";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import { eventOrders } from "@/server/events/infrastructure/event-order.schema";
import type { Driver } from "../models/driver.model";
import type { DeliveryRoute } from "../models/delivery-route.model";
import type { DeliverySettings } from "../models/delivery-settings.model";
import type { DeliveryOrder } from "../models/delivery-order.model";
import type { DeliveryAccess } from "../models/delivery-access.model";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { deliveryDrivers as drivers } from "./driver.schema";
import { deliverySettings as settings } from "./delivery-settings.schema";
import { deliveryRoutes as routes } from "./delivery-route.schema";
import { deliveryStops as stops } from "./delivery-stop.schema";
import { deliveryAccess as accesses } from "./delivery-access.schema";
const readRoute = ({
  payloadJson,
  ...row
}: typeof routes.$inferSelect): DeliveryRoute => ({
  ...row,
  orderIds: JSON.parse(payloadJson).orderIds,
});
const accessFields = {
  id: accesses.id,
  eventId: accesses.eventId,
  driverId: accesses.driverId,
  name: accesses.name,
  createdBy: accesses.createdBy,
  createdByName: accesses.createdByName,
  createdAt: accesses.createdAt,
  expiresAt: accesses.expiresAt,
  revokedAt: accesses.revokedAt,
  activatedAt: accesses.activatedAt,
};
const orderFields = {
  id: eventOrders.id,
  version: eventOrders.version,
  customerName: eventOrders.customerName,
  note: eventOrders.note,
  payloadJson: eventOrders.payloadJson,
  routeId: stops.routeId,
};
function readOrder({
  payloadJson,
  ...row
}: {
  id: string;
  version: number;
  customerName: string;
  note: string;
  payloadJson: string;
  routeId: string | null;
}): DeliveryOrder {
  const p = JSON.parse(payloadJson);
  return {
    ...row,
    address: p.address ?? null,
    contactPhone: p.contactPhone ?? "",
    fulfilled: p.fulfilled ?? false,
    items: p.items.map((i: { name: string; quantity: number }) => ({
      name: i.name,
      quantity: i.quantity,
    })),
  };
}
export class D1DeliveryRepository implements DeliveryRepository {
  constructor(private readonly db: Database) {}
  private async write<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (cause) {
      for (const code of [
        "DELIVERY_CHANGED",
        "DELIVERY_ORDER_ASSIGNED",
      ] as const)
        if (hasDatabaseError(cause, code))
          throwBusinessError({ code, category: "conflict" });
      throw cause;
    }
  }
  async drivers() {
    return this.db
      .select()
      .from(drivers)
      .orderBy(asc(drivers.name), asc(drivers.id))
      .all();
  }
  async saveDriver(value: Driver, expected: number) {
    return this.write(async () => {
      const r =
        expected === 0
          ? await this.db
              .insert(drivers)
              .values(value)
              .onConflictDoNothing({ target: drivers.id })
              .run()
          : await this.db
              .update(drivers)
              .set({
                ...value,
                version: sql`CASE WHEN ${drivers.version}=${expected} THEN ${value.version} ELSE 0 END`,
              })
              .where(eq(drivers.id, value.id))
              .run();
      return r.meta.changes > 0;
    });
  }
  async settings(eventId: string) {
    const r = await this.db
      .select()
      .from(settings)
      .where(eq(settings.eventId, eventId))
      .get();
    if (!r) return null;
    const { payloadJson, ...meta } = r;
    return { ...meta, ...JSON.parse(payloadJson) } as DeliverySettings;
  }
  async saveSettings(value: DeliverySettings, expected: number) {
    const { origin, driverIds, ...meta } = value;
    const values = {
      ...meta,
      payloadJson: JSON.stringify({ origin, driverIds }),
    };
    return this.write(async () => {
      const r =
        expected === 0
          ? await this.db
              .insert(settings)
              .values(values)
              .onConflictDoNothing({ target: settings.eventId })
              .run()
          : await this.db
              .update(settings)
              .set({
                ...values,
                version: sql`CASE WHEN ${settings.version}=${expected} THEN ${value.version} ELSE 0 END`,
              })
              .where(eq(settings.eventId, value.eventId))
              .run();
      return r.meta.changes > 0;
    });
  }
  async routeOptions(eventId: string) {
    return this.db
      .select({ id: routes.id, name: routes.name, version: routes.version })
      .from(routes)
      .where(and(eq(routes.eventId, eventId), eq(routes.cancelled, false)))
      .orderBy(asc(routes.name), asc(routes.id))
      .all();
  }
  async route(id: string) {
    const row = await this.db
      .select()
      .from(routes)
      .where(eq(routes.id, id))
      .get();
    return row ? readRoute(row) : null;
  }
  async routes(eventId: string, page: number, driverId?: string) {
    const condition = and(
      eq(routes.eventId, eventId),
      eq(routes.cancelled, false),
      driverId ? eq(routes.driverId, driverId) : undefined,
    );
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(routes)
          .where(condition)
          .get()
      )?.total ?? 0;
    page = Math.min(page, Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)));
    const rows = await this.db
      .select()
      .from(routes)
      .where(condition)
      .orderBy(
        asc(
          sql`CASE WHEN NOT EXISTS(SELECT 1 FROM delivery_stops s JOIN event_orders o ON o.id=s.order_id WHERE s.route_id=delivery_routes.id AND coalesce(json_extract(o.payload_json,'$.fulfilled'),0)=0) THEN 2 WHEN delivery_routes.started_at IS NOT NULL THEN 0 ELSE 1 END`,
        ),
        desc(routes.updatedAt),
        asc(routes.id),
      )
      .limit(DEFAULT_PAGE_SIZE)
      .offset((page - 1) * DEFAULT_PAGE_SIZE)
      .all();
    return {
      items: rows.map(readRoute),
      total,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    };
  }
  async orders(eventId: string, routeId: string) {
    const rows = await this.db
      .select(orderFields)
      .from(stops)
      .innerJoin(eventOrders, eq(eventOrders.id, stops.orderId))
      .where(
        and(
          eq(stops.routeId, routeId),
          eq(eventOrders.eventId, eventId),
          isNull(eventOrders.deletedAt),
        ),
      )
      .orderBy(asc(stops.position))
      .all();
    return rows.map(readOrder);
  }
  async candidates(eventId: string, query: string, page: number) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      eq(eventOrders.eventId, eventId),
      isNull(eventOrders.deletedAt),
      sql`json_extract(${eventOrders.payloadJson},'$.fulfillmentMode')='delivery'`,
      sql`coalesce(json_extract(${eventOrders.payloadJson},'$.fulfilled'),0)=0`,
      isNull(stops.orderId),
      sql`${eventOrders.customerName} LIKE ${search} ESCAPE '!'`,
    );
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(eventOrders)
          .leftJoin(stops, eq(stops.orderId, eventOrders.id))
          .where(condition)
          .get()
      )?.total ?? 0;
    page = Math.min(page, Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)));
    const rows = await this.db
      .select(orderFields)
      .from(eventOrders)
      .leftJoin(stops, eq(stops.orderId, eventOrders.id))
      .where(condition)
      .orderBy(asc(eventOrders.customerName), asc(eventOrders.id))
      .limit(DEFAULT_PAGE_SIZE)
      .offset((page - 1) * DEFAULT_PAGE_SIZE)
      .all();
    return {
      items: rows.map(readOrder),
      total,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    };
  }
  async saveRoutes(changes: { value: DeliveryRoute; expected: number }[]) {
    return this.write(async () => {
      const statements = changes.map(({ value, expected }) => {
        const { orderIds, ...row } = value;
        const data = { ...row, payloadJson: JSON.stringify({ orderIds }) };
        return expected === 0
          ? this.db
              .insert(routes)
              .values(data)
              .onConflictDoNothing({ target: routes.id })
          : this.db
              .update(routes)
              .set({
                ...data,
                version: sql`CASE WHEN ${routes.version}=${expected} THEN ${value.version} ELSE 0 END`,
              })
              .where(eq(routes.id, value.id));
      });
      const [first, ...rest] = statements;
      if (!first) return false;
      const results: { meta: { changes: number } }[] = await this.db.batch([
        first,
        ...rest,
      ]);
      return results.every((r) => r.meta.changes > 0);
    });
  }
  async accessByCredential(hash: string) {
    return (
      (await this.db
        .select(accessFields)
        .from(accesses)
        .where(eq(accesses.sessionHash, hash))
        .get()) ?? null
    );
  }
  async accessByLink(hash: string) {
    return (
      (await this.db
        .select(accessFields)
        .from(accesses)
        .where(eq(accesses.linkHash, hash))
        .get()) ?? null
    );
  }
  async createAccess(access: DeliveryAccess, hash: string) {
    return (
      (
        await this.db
          .insert(accesses)
          .values({ ...access, linkHash: hash })
          .onConflictDoNothing({ target: accesses.id })
          .run()
      ).meta.changes > 0
    );
  }
  async activate(hash: string, sessionHash: string) {
    return (
      (await this.db
        .update(accesses)
        .set({ sessionHash, activatedAt: sql`unixepoch()` })
        .where(
          and(
            eq(accesses.linkHash, hash),
            isNull(accesses.sessionHash),
            isNull(accesses.revokedAt),
            sql`${accesses.expiresAt}>unixepoch()`,
          ),
        )
        .returning(accessFields)
        .get()) ?? null
    );
  }
  async accesses(eventId: string) {
    return this.db
      .select(accessFields)
      .from(accesses)
      .where(eq(accesses.eventId, eventId))
      .orderBy(desc(accesses.createdAt), desc(accesses.id))
      .all();
  }
  async revoke(id: string, eventId: string) {
    await this.db
      .update(accesses)
      .set({ revokedAt: sql`unixepoch()` })
      .where(
        and(
          eq(accesses.id, id),
          eq(accesses.eventId, eventId),
          isNull(accesses.revokedAt),
        ),
      )
      .run();
  }
}
