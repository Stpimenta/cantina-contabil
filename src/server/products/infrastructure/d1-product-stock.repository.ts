import type { StockEntryCursor } from "../models/stock-entry-cursor.model";
import { and, count, desc, eq, isNull, sql, lt, or } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import type { StockEntry } from "../models/stock-entry.model";
import { productStockEntries as entries } from "./product-stock-entry.schema";
export class D1ProductStockRepository implements ProductStockRepository {
  constructor(private readonly db: Database) {}
  async productionDemand(categoryId: string, range?: { from: string; to: string }) {
    const inPeriod = range
      ? sql`json_extract(o.payload_json, '$.pickupOn') BETWEEN ${range.from} AND ${range.to}`
      : sql`1`;
    return this.db.all<{ productId: string; name: string; pending: number; allPending: number; available: number }>(sql`
      WITH demand AS (
        SELECT json_extract(i.value, '$.id') AS productId,
          json_extract(i.value, '$.name') AS name,
          CASE WHEN ${inPeriod} THEN 1 ELSE 0 END AS inPeriod,
          max(0, json_extract(i.value, '$.quantity') -
            CASE WHEN e.kind = 'product_category' OR (e.delivery_enabled = 0 AND e.canteen_enabled = 0)
              THEN coalesce((SELECT json_extract(w.value, '$.quantity')
                FROM json_each(o.payload_json, '$.withdrawals') w
                WHERE json_extract(w.value, '$.productId') = json_extract(i.value, '$.id')), 0)
              WHEN coalesce(json_extract(o.payload_json, '$.fulfilled'), 0) = 1
                OR coalesce(json_extract(o.payload_json, '$.collected'), 0) = 1
              THEN json_extract(i.value, '$.quantity') ELSE 0 END) AS remaining
        FROM event_orders o JOIN events e ON e.id = o.event_id,
          json_each(o.payload_json, '$.items') i
        WHERE o.event_id = ${categoryId} AND o.deleted_at IS NULL
      )
      SELECT productId, max(name) AS name,
        sum(CASE WHEN inPeriod = 1 THEN remaining ELSE 0 END) AS pending,
        sum(remaining) AS allPending,
        coalesce((SELECT b.quantity FROM product_stock_balances b
          WHERE b.event_id = ${categoryId} AND b.product_id = demand.productId), 0) AS available
      FROM demand GROUP BY productId
    `);
  }
  async productInUse(categoryId: string, productId: string) {
    const rows = await this.db.all<{ used: number }>(sql`
      SELECT (EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=${categoryId} AND product_id=${productId} AND deleted_at IS NULL)
      OR EXISTS(SELECT 1 FROM event_orders o, json_each(o.payload_json,'$.items') i
        WHERE o.event_id=${categoryId} AND o.deleted_at IS NULL AND json_extract(i.value,'$.id')=${productId})) AS used
    `);
    return Boolean(rows[0]?.used);
  }
  async balances(categoryId: string) {
    const rows = await this.db.all<{ productId: string; quantity: number }>(
      sql`SELECT product_id AS productId,quantity FROM product_stock_balances WHERE event_id=${categoryId}`,
    );
    if (rows.some((r) => !Number.isSafeInteger(r.quantity) || r.quantity < 0))
      throw new Error("Invalid product stock balance");
    return rows;
  }
  async entriesBefore(categoryId: string, productId: string, cursor: StockEntryCursor | null, limit: number) {
    return this.db.select().from(entries).where(and(
      eq(entries.eventId, categoryId), eq(entries.productId, productId), isNull(entries.deletedAt),
      cursor ? or(lt(entries.createdAt, cursor.createdAt), and(eq(entries.createdAt, cursor.createdAt), lt(entries.id, cursor.id))) : undefined,
    )).orderBy(desc(entries.createdAt), desc(entries.id)).limit(limit).all();
  }
  async entries(
    categoryId: string,
    productId: string,
    page: number,
    pageSize: number,
  ) {
    const condition = and(
      eq(entries.eventId, categoryId),
      eq(entries.productId, productId),
      isNull(entries.deletedAt),
    );
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(entries)
          .where(condition)
          .get()
      )?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const items = await this.db
      .select()
      .from(entries)
      .where(condition)
      .orderBy(desc(entries.createdAt), desc(entries.id))
      .limit(pageSize)
      .offset((current - 1) * pageSize)
      .all();
    return { items, total, page: current, pageSize, query: "" };
  }
  async findEntry(id: string) {
    return (
      (await this.db.select().from(entries).where(eq(entries.id, id)).get()) ??
      null
    );
  }
  async saveEntries(values: StockEntry[], addition?: StockEntry) {
    const [first, ...rest] = values;
    if (!first) return;
    // The version trigger raises on a stale row. Do not filter on version here:
    // a silently skipped UPDATE would allow a partially saved batch.
    // Physical deletion is forbidden by product_stock_entry_no_delete.
    const update = (entry: StockEntry) =>
      this.db.update(entries).set(entry).where(eq(entries.id, entry.id));
    try {
      if (addition) {
        await this.db.batch([
          this.db.insert(entries).values(addition),
          update(first),
          ...rest.map(update),
        ]);
      } else {
        await this.db.batch([update(first), ...rest.map(update)]);
      }
    } catch (cause) {
      for (const code of [
        "STOCK_ENTRY_REDUCTION_BLOCKED",
        "STOCK_CHANGED",
        "STOCK_LIMIT",
        "INVALID_STOCK_INPUT",
      ] as const)
        if (hasDatabaseError(cause, code))
          throwBusinessError({ code, category: "conflict" });
      throw cause;
    }
  }
  async saveEntry(entry: StockEntry, expectedVersion: number) {
    try {
      const result =
        expectedVersion === 0
          ? await this.db
              .insert(entries)
              .values(entry)
              .onConflictDoNothing({ target: entries.id })
              .run()
          : await this.db
              .update(entries)
              .set(entry)
              .where(
                and(
                  eq(entries.id, entry.id),
                  eq(entries.version, expectedVersion),
                  eq(entries.eventId, entry.eventId),
                  eq(entries.productId, entry.productId),
                ),
              )
              .run();
      return result.meta.changes > 0;
    } catch (cause) {
      for (const code of [
        "STOCK_ENTRY_REDUCTION_BLOCKED",
        "STOCK_CHANGED",
        "STOCK_LIMIT",
        "INVALID_STOCK_INPUT",
      ] as const)
        if (hasDatabaseError(cause, code))
          throwBusinessError({ code, category: "conflict" });
      throw cause;
    }
  }
}
