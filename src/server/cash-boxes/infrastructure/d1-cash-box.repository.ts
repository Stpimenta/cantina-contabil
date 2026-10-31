import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  getTableName,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import type { CashBox } from "../models/cash-box.model";
import type {
  CashBoxHistoryEntry,
  CashBoxHistoryCategory,
} from "../models/cash-box-history-entry.model";
import type {
  CashBoxList,
  CashBoxRepository,
  WriteOutcome,
} from "../repositories/cash-box.repository";
import { nameKey } from "../models/cash-box-rules";
import { cashBoxes } from "./cash-box.schema";
import { cashBoxAudit } from "./cash-box-audit.schema";
import { donations } from "@/server/donations/infrastructure/donation.schema";

const { nameKey: _nameKey, ...boxColumns } = getTableColumns(cashBoxes);
// Preserve the outer table qualifier inside correlated subqueries, even when
// Drizzle simplifies column references for a single-table select.
const outerCashBoxId = sql`${sql.identifier(getTableName(cashBoxes))}.${sql.identifier(cashBoxes.id.name)}`;
const summaryColumns = {
  ...boxColumns,
  balanceCents: sql<number>`coalesce((SELECT sum(${donations.amountCents}) FROM ${donations} WHERE ${donations.cashBoxId}=${outerCashBoxId} AND ${donations.deletedAt} IS NULL),0) + coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=${outerCashBoxId} AND o.deleted_at IS NULL AND o.paid=1),0) - coalesce((SELECT sum(s.amount_cents) FROM event_supplies s WHERE s.cash_box_id=${outerCashBoxId} AND s.source='purchase' AND s.deleted_at IS NULL),0) + coalesce((SELECT sum(CASE m.direction WHEN 'incoming' THEN m.amount_cents ELSE -m.amount_cents END) FROM cash_movements m WHERE m.cash_box_id=${outerCashBoxId} AND m.deleted_at IS NULL),0)`,
  pendingCents: sql<number>`coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=${outerCashBoxId} AND o.deleted_at IS NULL AND o.paid=0),0)`,
};

export class D1CashBoxRepository implements CashBoxRepository {
  constructor(private readonly db: Database) {}

  private async write(
    execute: () => Promise<{ meta: { changes: number } }>,
  ): Promise<WriteOutcome> {
    try {
      const result = await execute();
      return result.meta.changes > 0 ? "saved" : "stale";
    } catch (cause) {
      if (
        hasDatabaseError(cause, "CASH_BOX_HAS_DONATIONS") ||
        hasDatabaseError(cause, "CASH_BOX_HAS_MOVEMENTS") ||
        hasDatabaseError(cause, "CASH_BOX_HAS_EVENTS") ||
        hasDatabaseError(cause, "CASH_BOX_HAS_SUPPLIES")
      )
        return "linked";
      if (
        hasDatabaseError(cause, "UNIQUE constraint failed: cash_boxes.name_key")
      )
        return "duplicate";
      throw cause;
    }
  }
  async overview() {
    return this.db
      .select(summaryColumns)
      .from(cashBoxes)
      .where(isNull(cashBoxes.deletedAt))
      .orderBy(desc(cashBoxes.createdAt), desc(cashBoxes.id))
      .all();
  }
  async list(
    query: string,
    page: number,
    pageSize: number,
  ): Promise<CashBoxList> {
    const search = `%${nameKey(query).replace(/[!%_]/g, "!$&")}%`;
    const condition = and(
      isNull(cashBoxes.deletedAt),
      sql`${cashBoxes.nameKey} LIKE ${search} ESCAPE '!'`,
    );
    const result = await this.db
      .select({ total: count() })
      .from(cashBoxes)
      .where(condition)
      .get();
    const total = result?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const items = await this.db
      .select(summaryColumns)
      .from(cashBoxes)
      .where(condition)
      .orderBy(desc(cashBoxes.createdAt), desc(cashBoxes.id))
      .limit(pageSize)
      .offset((current - 1) * pageSize)
      .all();
    if (
      items.some(
        (row) =>
          !Number.isSafeInteger(row.balanceCents) ||
          !Number.isSafeInteger(row.pendingCents),
      )
    )
      throw new Error("Saldo fora da precisão segura");
    return { items, total, page: current, pageSize, query };
  }
  async find(id: string) {
    const row = await this.db
      .select(summaryColumns)
      .from(cashBoxes)
      .where(and(eq(cashBoxes.id, id), isNull(cashBoxes.deletedAt)))
      .get();
    if (
      row &&
      (!Number.isSafeInteger(row.balanceCents) ||
        !Number.isSafeInteger(row.pendingCents))
    )
      throw new Error("Saldo fora da precisão segura");
    return row ?? null;
  }
  create(box: CashBox) {
    return this.write(() =>
      this.db
        .insert(cashBoxes)
        .values({ ...box, nameKey: nameKey(box.name) })
        .run(),
    );
  }
  update(box: CashBox, expectedVersion: number) {
    return this.write(() =>
      this.db
        .update(cashBoxes)
        .set({
          name: box.name,
          nameKey: nameKey(box.name),
          description: box.description,
          updatedAt: box.updatedAt,
          updatedBy: box.updatedBy,
          updatedByName: box.updatedByName,
          version: sql`${cashBoxes.version}+1`,
        })
        .where(
          and(
            eq(cashBoxes.id, box.id),
            eq(cashBoxes.version, expectedVersion),
            isNull(cashBoxes.deletedAt),
          ),
        )
        .run(),
    );
  }
  softDelete(box: CashBox, expectedVersion: number) {
    return this.write(() =>
      this.db
        .update(cashBoxes)
        .set({
          deletedAt: box.deletedAt,
          deletedBy: box.deletedBy,
          deletedByName: box.deletedByName,
          updatedAt: box.updatedAt,
          updatedBy: box.updatedBy,
          updatedByName: box.updatedByName,
          version: sql`${cashBoxes.version}+1`,
        })
        .where(
          and(
            eq(cashBoxes.id, box.id),
            eq(cashBoxes.version, expectedVersion),
            isNull(cashBoxes.deletedAt),
          ),
        )
        .run(),
    );
  }
  async history(
    id: string,
    page: number,
    pageSize: number,
    category: CashBoxHistoryCategory = "all",
  ) {
    // Keep the existing stable union and snapshots, parameterized through Drizzle.
    const source = sql`SELECT printf('event-%020d',${cashBoxAudit.id}) AS id,'events' AS category,${cashBoxAudit.action} AS action,${cashBoxAudit.actorId} AS actorId,${cashBoxAudit.actorName} AS actorName,${cashBoxAudit.occurredAt} AS occurredAt,${cashBoxAudit.beforeJson} AS beforeJson,${cashBoxAudit.afterJson} AS afterJson,NULL AS amountCents,NULL AS donatedOn,NULL AS donorName,NULL AS note FROM ${cashBoxAudit} WHERE ${cashBoxAudit.cashBoxId}=${id}
      UNION ALL SELECT a.id,'incoming',CASE WHEN a.action='create' THEN 'donation' ELSE 'donation_'||a.action END,a.actor_id,a.actor_name,a.occurred_at,a.before_json,a.after_json,NULL,NULL,NULL,NULL FROM donation_audit a WHERE a.cash_box_id=${id} OR json_extract(a.before_json,'$.cashBoxId')=${id}
 UNION ALL SELECT a.id,CASE WHEN a.resource_type='order' AND (json_extract(a.after_json,'$.paid')=1 OR coalesce(json_extract(a.before_json,'$.paid'),0)=1) THEN 'incoming' ELSE 'events' END,a.resource_type || '_' || CASE WHEN json_extract(a.after_json,'$.deletedAt') IS NOT NULL THEN 'delete' ELSE a.action END,a.actor_id,a.actor_name,a.occurred_at,a.before_json,a.after_json,NULL,NULL,NULL,NULL FROM event_audit a JOIN events e ON e.id=a.event_id WHERE e.cash_box_id=${id}
 UNION ALL SELECT a.id,'outgoing','supply_' || CASE WHEN json_extract(a.after_json,'$.deletedAt') IS NOT NULL THEN 'delete' ELSE a.action END,a.actor_id,a.actor_name,a.occurred_at,json_remove(a.before_json,'$.receiptKey','$.receipts'),json_remove(a.after_json,'$.receiptKey','$.receipts'),NULL,NULL,NULL,NULL FROM event_supply_audit a WHERE a.cash_box_id=${id} OR json_extract(a.before_json,'$.cashBoxId')=${id}
 UNION ALL SELECT a.id,CASE WHEN json_extract(a.after_json,'$.direction')='incoming' THEN 'incoming' ELSE 'outgoing' END,'movement_' || a.action,a.actor_id,a.actor_name,a.occurred_at,json_remove(a.before_json,'$.receipts'),json_remove(a.after_json,'$.receipts'),NULL,NULL,NULL,NULL FROM cash_movement_audit a WHERE a.cash_box_id=${id} OR json_extract(a.before_json,'$.cashBoxId')=${id}`;
    const condition: SQL =
      category === "all"
        ? sql``
        : sql` WHERE category=${category} OR (action IN ('movement_create','movement_update','movement_delete') AND json_extract(beforeJson,'$.direction')=${category})`;
    const result = await this.db.get<{ total: number }>(
      sql`SELECT count(*) AS total FROM (${source})${condition}`,
    );
    const total = result?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    type Row = Omit<CashBoxHistoryEntry, "before" | "after"> & {
      beforeJson: string | null;
      afterJson: string | null;
    };
    const rows = await this.db.all<Row>(
      sql`SELECT * FROM (${source})${condition} ORDER BY occurredAt DESC,id DESC LIMIT ${pageSize} OFFSET ${(current - 1) * pageSize}`,
    );
    return {
      total,
      page: current,
      items: rows.map(({ beforeJson, afterJson, ...row }) => {
        const before = beforeJson ? JSON.parse(beforeJson) : null;
        const after = afterJson ? JSON.parse(afterJson) : null;
        const donationEntry =
          row.action === "donation" || row.action.startsWith("donation_");
        const movementEntry = row.action.startsWith("movement_");
        const eventEntry =
          row.action.startsWith("event_") ||
          row.action.startsWith("order_") ||
          row.action.startsWith("supply_");
        return {
          ...row,
          before: eventEntry || movementEntry || donationEntry ? null : before,
          after: eventEntry || movementEntry || donationEntry ? null : after,
          ...(donationEntry ? { donationDetails: { before, after } } : {}),
          ...(movementEntry ? { movementDetails: { before, after } } : {}),
          ...(eventEntry
            ? {
                eventDetails: {
                  resourceType: row.action.startsWith("event_")
                    ? "event"
                    : row.action.startsWith("supply_")
                      ? "supply"
                      : "order",
                  before,
                  after,
                },
              }
            : {}),
        };
      }) as CashBoxHistoryEntry[],
    };
  }
}
