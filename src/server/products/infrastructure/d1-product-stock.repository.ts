import type { StockPosition } from "../models/stock-position.model";
import type { StockEntryCursor } from "../models/stock-entry-cursor.model";
import {
  and,
  count,
  desc,
  eq,
  isNull,
  sql,
  lt,
  or,
  getTableColumns,
} from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import type { StockEntry } from "../models/stock-entry.model";
import { productStockEntries as entries } from "./product-stock-entry.schema";
const orderRemaining = sql`max(0, json_extract(i.value, '$.quantity') -
            CASE WHEN e.kind = 'product_category' OR (e.delivery_enabled = 0 AND e.canteen_enabled = 0)
              THEN coalesce((SELECT json_extract(w.value, '$.quantity')
                FROM json_each(o.payload_json, '$.withdrawals') w
                WHERE json_extract(w.value, '$.productId') = json_extract(i.value, '$.id')), 0)
              WHEN coalesce(json_extract(o.payload_json, '$.fulfilled'), 0) = 1
                OR coalesce(json_extract(o.payload_json, '$.collected'), 0) = 1
              THEN json_extract(i.value, '$.quantity') ELSE 0 END)`;
const orderInPeriod = (range?: { from: string; to: string }) =>
  range
    ? sql`(CASE WHEN e.kind='event' THEN e.occurs_on
      ELSE json_extract(o.payload_json, '$.pickupOn') END)
      BETWEEN ${range.from} AND ${range.to}`
    : sql`1`;
const memberCondition = (categoryId: string, productId: string) => sql`(
 (${entries.eventId}=${categoryId} AND ${entries.productId}=${productId}) OR EXISTS(
 SELECT 1 FROM product_stock_members a JOIN product_stock_members b ON a.stock_id=b.stock_id
 WHERE a.event_id=${categoryId} AND a.product_id=${productId} AND b.event_id=${entries.eventId} AND b.product_id=${entries.productId}))`;
const originFields = {
  productName: sql<string>`coalesce((SELECT json_extract(p.value,'$.name') FROM events e,json_each(e.payload_json,'$.products') p WHERE e.id=${sql.identifier("product_stock_entries")}.${sql.identifier("event_id")} AND json_extract(p.value,'$.id')=${sql.identifier("product_stock_entries")}.${sql.identifier("product_id")}), '')`,
  categoryName: sql<string>`coalesce((SELECT name FROM events WHERE id=${sql.identifier("product_stock_entries")}.${sql.identifier("event_id")}), '')`,
};
function entryValues({
  productName: _productName,
  categoryName: _categoryName,
  ...entry
}: StockEntry) {
  return entry;
}
export class D1ProductStockRepository implements ProductStockRepository {
  constructor(private readonly db: Database) {}
  async positions(categoryId: string, range?: { from: string; to: string }) {
    const inPeriod = orderInPeriod(range);
    const rows = await this.db.all<StockPosition>(sql`
      WITH target_products AS (
        SELECT json_extract(p.value,'$.id') product_id
        FROM events e,json_each(e.payload_json,'$.products') p
        WHERE e.id=${categoryId} AND e.deleted_at IS NULL
        UNION
        SELECT json_extract(i.value,'$.id')
        FROM event_orders o,json_each(o.payload_json,'$.items') i
        WHERE o.event_id=${categoryId} AND o.deleted_at IS NULL
      ), target_stocks AS (
        SELECT coalesce(m.stock_id,${categoryId}||':'||t.product_id) stock_id
        FROM target_products t LEFT JOIN product_stock_members m
          ON m.event_id=${categoryId} AND m.product_id=t.product_id
      ), participants AS (
        SELECT m.event_id,m.product_id,m.stock_id,m.revision
        FROM product_stock_members m
        WHERE m.stock_id IN (SELECT stock_id FROM target_stocks)
        UNION ALL
        SELECT ${categoryId},t.product_id,${categoryId}||':'||t.product_id,0
        FROM target_products t WHERE NOT EXISTS(
          SELECT 1 FROM product_stock_members m
          WHERE m.event_id=${categoryId} AND m.product_id=t.product_id)
      ), demand AS (
        SELECT o.event_id,json_extract(i.value,'$.id') product_id,
          sum(CASE WHEN ${inPeriod} THEN ${orderRemaining} ELSE 0 END) pending,
          sum(${orderRemaining}) all_pending
        FROM event_orders o JOIN events e ON e.id=o.event_id,
          json_each(o.payload_json,'$.items') i
        WHERE o.deleted_at IS NULL AND e.deleted_at IS NULL
          AND o.event_id IN (SELECT event_id FROM participants)
          AND EXISTS(SELECT 1 FROM participants p
            WHERE p.event_id=o.event_id AND p.product_id=json_extract(i.value,'$.id'))
        GROUP BY o.event_id,json_extract(i.value,'$.id')
      )
      SELECT p.event_id eventId,p.product_id productId,p.stock_id stockId,p.revision,
        e.version eventVersion,e.name categoryName,e.cash_box_id cashBoxId,
        coalesce(json_extract(c.value,'$.name'),(
          SELECT json_extract(i.value,'$.name') FROM event_orders o,
            json_each(o.payload_json,'$.items') i
          WHERE o.event_id=p.event_id AND o.deleted_at IS NULL
            AND json_extract(i.value,'$.id')=p.product_id LIMIT 1),'') productName,
        coalesce(b.quantity,0) quantity,coalesce(d.pending,0) pending,
        coalesce(d.all_pending,0) allPending
      FROM participants p JOIN events e ON e.id=p.event_id
      LEFT JOIN json_each(e.payload_json,'$.products') c
        ON json_extract(c.value,'$.id')=p.product_id
      LEFT JOIN product_stock_balances b ON b.event_id=p.event_id AND b.product_id=p.product_id
      LEFT JOIN demand d ON d.event_id=p.event_id AND d.product_id=p.product_id
      WHERE e.deleted_at IS NULL AND (c.value IS NOT NULL OR d.product_id IS NOT NULL)
      ORDER BY CASE WHEN p.event_id=${categoryId} THEN 0 ELSE 1 END,
        p.event_id,coalesce(c.key,100),p.product_id
    `);
    if (
      rows.some(
        (row) =>
          ![row.quantity, row.pending, row.allPending].every(
            (v) => Number.isSafeInteger(v) && v >= 0,
          ),
      )
    )
      throw new Error("Invalid stock position");
    return rows;
  }
  async productionDemand(
    categoryId: string,
    range?: { from: string; to: string },
  ) {
    const inPeriod = orderInPeriod(range);
    return this.db.all<{
      productId: string;
      name: string;
      pending: number;
      allPending: number;
      available: number;
    }>(sql`
      WITH demand AS (
        SELECT json_extract(i.value, '$.id') AS productId,
          json_extract(i.value, '$.name') AS name,
          CASE WHEN ${inPeriod} THEN 1 ELSE 0 END AS inPeriod,
          ${orderRemaining} AS remaining
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
      OR EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=${categoryId} AND m.product_id=${productId} AND ((SELECT count(*) FROM product_stock_members WHERE stock_id=m.stock_id)>1 OR coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=m.event_id AND product_id=m.product_id),0)!=0))
      OR EXISTS(SELECT 1 FROM event_orders o, json_each(o.payload_json,'$.items') i
        WHERE o.event_id=${categoryId} AND o.deleted_at IS NULL AND json_extract(i.value,'$.id')=${productId})) AS used
    `);
    return Boolean(rows[0]?.used);
  }
  async balances(categoryId: string) {
    const rows = await this.db.all<{
      productId: string;
      quantity: number;
      stockId: string;
    }>(
      sql`SELECT product_id AS productId,quantity,CASE WHEN (SELECT count(*) FROM product_stock_members m WHERE m.stock_id=product_stock_balances.stock_id)>1 THEN stock_id END AS stockId FROM product_stock_balances WHERE event_id=${categoryId}`,
    );
    if (rows.some((r) => !Number.isSafeInteger(r.quantity) || r.quantity < 0))
      throw new Error("Invalid product stock balance");
    return rows.map(({ stockId, ...row }) =>
      stockId ? { ...row, stockId } : row,
    );
  }
  async entriesBefore(
    categoryId: string,
    productId: string,
    cursor: StockEntryCursor | null,
    limit: number,
  ) {
    return this.db
      .select({ ...getTableColumns(entries), ...originFields })
      .from(entries)
      .where(
        and(
          memberCondition(categoryId, productId),
          isNull(entries.deletedAt),
          cursor
            ? or(
                lt(entries.createdAt, cursor.createdAt),
                and(
                  eq(entries.createdAt, cursor.createdAt),
                  lt(entries.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(entries.createdAt), desc(entries.id))
      .limit(limit)
      .all();
  }
  async entries(
    categoryId: string,
    productId: string,
    page: number,
    pageSize: number,
  ) {
    const condition = and(
      memberCondition(categoryId, productId),
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
      .select({ ...getTableColumns(entries), ...originFields })
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
      this.db
        .update(entries)
        .set(entryValues(entry))
        .where(eq(entries.id, entry.id));
    try {
      if (addition) {
        await this.db.batch([
          this.db.insert(entries).values(entryValues(addition)),
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
              .values(entryValues(entry))
              .onConflictDoNothing({ target: entries.id })
              .run()
          : await this.db
              .update(entries)
              .set(entryValues(entry))
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
