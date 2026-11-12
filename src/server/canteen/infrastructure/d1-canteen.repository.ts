import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import type { CanteenRepository } from "../repositories/canteen.repository";
import type { TemporaryAccess } from "../models/temporary-access.model";
import type { Command } from "../models/command.model";
import { canteenAccess as accesses } from "./canteen-access.schema";
import { eventOrders as orders } from "@/server/events/infrastructure/event-order.schema";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import { throwBusinessError } from "@/shared/errors/business-error";
const fields = {
  id: accesses.id,
  eventId: accesses.eventId,
  name: accesses.name,
  createdBy: accesses.createdBy,
  createdByName: accesses.createdByName,
  createdAt: accesses.createdAt,
  expiresAt: accesses.expiresAt,
  revokedAt: accesses.revokedAt,
  activatedAt: accesses.activatedAt,
};
export class D1CanteenRepository implements CanteenRepository {
  constructor(private readonly db: Database) {}
  async accessByCredential(hash: string) {
    return (
      (await this.db
        .select(fields)
        .from(accesses)
        .where(eq(accesses.sessionHash, hash))
        .get()) ?? null
    );
  }
  async accessByLink(hash: string) {
    return (
      (await this.db
        .select(fields)
        .from(accesses)
        .where(eq(accesses.linkHash, hash))
        .get()) ?? null
    );
  }
  async createAccess(a: TemporaryAccess, hash: string) {
    const r = await this.db
      .insert(accesses)
      .values({ ...a, linkHash: hash })
      .onConflictDoNothing({ target: accesses.id })
      .run();
    return r.meta.changes > 0;
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
        .returning(fields)
        .get()) ?? null
    );
  }
  async revoke(id: string, eventId: string, operation: string) {
    // The trigger commits the publication atomically with revocation.
    try {
      await this.db
        .update(accesses)
        .set({ revokedAt: sql`unixepoch()`, revocationOperation: operation })
        .where(
          and(
            eq(accesses.id, id),
            eq(accesses.eventId, eventId),
            isNull(accesses.revokedAt),
          ),
        )
        .run();
    } catch (cause) {
      if (hasDatabaseError(cause, "CANTEEN_PUBLICATION_REQUIRED"))
        throwBusinessError({ code: "EVENT_CHANGED", category: "conflict" });
      throw cause;
    }
  }
  async listAccess(eventId: string) {
    return this.db
      .select(fields)
      .from(accesses)
      .where(eq(accesses.eventId, eventId))
      .orderBy(desc(accesses.createdAt), desc(accesses.id))
      .all();
  }
  async commands(
    eventId: string,
    query: string,
    page: number,
    collected: boolean,
  ) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      eq(orders.eventId, eventId),
      isNull(orders.deletedAt),
      sql`${orders.customerName} LIKE ${search} ESCAPE '!'`,
      sql`coalesce(json_extract(${orders.payloadJson},'$.collected'),0)=${collected ? 1 : 0}`,
    );
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(orders)
          .where(condition)
          .get()
      )?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / 15)));
    const rows = await this.db
      .select({
        id: orders.id,
        version: orders.version,
        customerName: orders.customerName,
        note: orders.note,
        createdAt: orders.createdAt,
        paid: orders.paid,
        payload: orders.payloadJson,
      })
      .from(orders)
      .where(condition)
      .orderBy(asc(orders.createdAt), asc(orders.id))
      .limit(15)
      .offset((current - 1) * 15)
      .all();
    const items: Command[] = rows.map(({ payload, ...r }) => {
      const p = JSON.parse(payload);
      return {
        ...r,
        collected,
        items: p.items.map(
          (i: { name: string; quantity: number; icon: string }) => ({
            name: i.name,
            quantity: i.quantity,
            icon: i.icon,
          }),
        ),
      };
    });
    return {
      eventId,
      eventName: "",
      items,
      total,
      page: current,
      pageSize: 15,
      query,
      collected,
    };
  }
}
