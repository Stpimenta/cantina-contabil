import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import type { EventSupply } from "../models/event-supply.model";
import type { EventSupplyRepository } from "../repositories/event-supply.repository";
import { eventSupplies } from "./event-supply.schema";
export class D1EventSupplyRepository implements EventSupplyRepository {
  constructor(private readonly db: Database) {}

  async find(id: string) {
    return (
      (await this.db
        .select()
        .from(eventSupplies)
        .where(eq(eventSupplies.id, id))
        .get()) ?? null
    );
  }
  async list(eventId: string, page: number, pageSize: number) {
    const condition = and(
      eq(eventSupplies.eventId, eventId),
      isNull(eventSupplies.deletedAt),
    );
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(eventSupplies)
          .where(condition)
          .get()
      )?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const items = await this.db
      .select()
      .from(eventSupplies)
      .where(condition)
      .orderBy(desc(eventSupplies.createdAt), desc(eventSupplies.id))
      .limit(pageSize)
      .offset((current - 1) * pageSize)
      .all();
    return { items, total, page: current, pageSize, query: "" };
  }
  async create(
    value: EventSupply,
  ): ReturnType<EventSupplyRepository["create"]> {
    try {
      const result = await this.db
        .insert(eventSupplies)
        .values(value)
        .onConflictDoNothing({ target: eventSupplies.id })
        .run();
      return result.meta.changes > 0 ? "saved" : "exists";
    } catch (cause) {
      if (hasDatabaseError(cause, "SUPPLY_INSUFFICIENT_BALANCE"))
        return "insufficient";
      if (hasDatabaseError(cause, "SUPPLY_BOX_UNAVAILABLE"))
        return "box_unavailable";
      if (hasDatabaseError(cause, "SUPPLY_EVENT_UNAVAILABLE"))
        return "event_unavailable";
      if (hasDatabaseError(cause, "SUPPLY_AMOUNT_LIMIT")) return "limit";
      throw cause;
    }
  }
  async update(
    value: EventSupply,
    expectedVersion: number,
  ): ReturnType<EventSupplyRepository["update"]> {
    try {
      const {
        id,
        eventId,
        createdAt,
        createdBy,
        createdByName,
        fingerprint,
        ...changes
      } = value;
      const result = await this.db
        .update(eventSupplies)
        .set(changes)
        .where(
          and(
            eq(eventSupplies.id, id),
            eq(eventSupplies.eventId, eventId),
            eq(eventSupplies.version, expectedVersion),
            isNull(eventSupplies.deletedAt),
          ),
        )
        .run();
      return result.meta.changes ? "saved" : "changed";
    } catch (cause) {
      if (hasDatabaseError(cause, "SUPPLY_INSUFFICIENT_BALANCE"))
        return "insufficient";
      if (hasDatabaseError(cause, "SUPPLY_BOX_UNAVAILABLE"))
        return "box_unavailable";
      if (hasDatabaseError(cause, "SUPPLY_EVENT_UNAVAILABLE"))
        return "event_unavailable";
      if (hasDatabaseError(cause, "SUPPLY_AMOUNT_LIMIT")) return "limit";
      throw cause;
    }
  }
  async softDelete(
    id: string,
    eventId: string,
    version: number,
    actorId: number,
    actorName: string,
    at: string,
  ) {
    const result = await this.db
      .update(eventSupplies)
      .set({
        deletedAt: at,
        deletedBy: actorId,
        deletedByName: actorName,
        updatedAt: at,
        updatedBy: actorId,
        updatedByName: actorName,
        version: version + 1,
      })
      .where(
        and(
          eq(eventSupplies.id, id),
          eq(eventSupplies.eventId, eventId),
          eq(eventSupplies.version, version),
          isNull(eventSupplies.deletedAt),
        ),
      )
      .run();
    return result.meta.changes > 0;
  }
  async receive(
    id: string,
    eventId: string,
    version: number,
    actorId: number,
    actorName: string,
    at: string,
  ) {
    const result = await this.db
      .update(eventSupplies)
      .set({
        received: true,
        version: version + 1,
        updatedAt: at,
        updatedBy: actorId,
        updatedByName: actorName,
      })
      .where(
        and(
          eq(eventSupplies.id, id),
          eq(eventSupplies.eventId, eventId),
          eq(eventSupplies.version, version),
          eq(eventSupplies.source, "donation"),
          eq(eventSupplies.received, false),
          isNull(eventSupplies.deletedAt),
        ),
      )
      .run();
    return result.meta.changes > 0;
  }
}
