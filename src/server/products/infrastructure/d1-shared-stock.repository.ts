import { eq, sql } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import type {
  StockMember,
  StockLinkOperation,
  SharedStockHistory,
} from "../models/shared-stock.model";
import { productStockLinks } from "./product-stock-link.schema";
const memberSelect = sql`SELECT m.event_id AS eventId,m.product_id AS productId,m.stock_id AS stockId,m.revision,
 e.version AS eventVersion,e.name AS categoryName,e.cash_box_id AS cashBoxId,
 json_extract(p.value,'$.name') AS productName,coalesce(b.quantity,0) AS quantity
 FROM product_stock_members m JOIN events e ON e.id=m.event_id,
 json_each(e.payload_json,'$.products') p
 LEFT JOIN product_stock_balances b ON b.event_id=m.event_id AND b.product_id=m.product_id
 WHERE e.kind='product_category' AND e.deleted_at IS NULL AND json_extract(p.value,'$.id')=m.product_id`;
export class D1SharedStockRepository implements SharedStockRepository {
  constructor(private readonly db: Database) {}
  async members(categoryId: string, productIds: string[]) {
    if (!productIds.length) return [];
    return this.db.all<StockMember>(sql`${memberSelect} AND m.stock_id IN (
    SELECT stock_id FROM product_stock_members WHERE event_id=${categoryId} AND product_id IN (${sql.join(
      productIds.map((id) => sql`${id}`),
      sql`,`,
    )})
   ) ORDER BY m.event_id,m.product_id`);
  }
  async candidates(query: string) {
    // Authorization is applied before returning names/options to the client.
    return this.db.all<StockMember>(
      sql`${memberSelect} AND (instr(lower(e.name),lower(${query}))>0 OR instr(lower(json_extract(p.value,'$.name')),lower(${query}))>0) ORDER BY e.name,m.product_id`,
    );
  }
  async findOperation(id: string) {
    return (
      (await this.db
        .select()
        .from(productStockLinks)
        .where(eq(productStockLinks.id, id))
        .get()) ?? null
    );
  }
  async saveOperation(operation: StockLinkOperation) {
    try {
      await this.db
        .insert(productStockLinks)
        .values(operation)
        .onConflictDoNothing({ target: productStockLinks.id })
        .run();
    } catch (cause) {
      if (
        hasDatabaseError(cause, "STOCK_CHANGED") ||
        hasDatabaseError(cause, "INVALID_STOCK_INPUT")
      ) {
        const saved = await this.findOperation(operation.id);
        if (
          saved?.actorId === operation.actorId &&
          saved.fingerprint === operation.fingerprint
        )
          return;
      }
      for (const code of [
        "STOCK_CHANGED",
        "STOCK_LIMIT",
        "INVALID_STOCK_INPUT",
      ] as const)
        if (hasDatabaseError(cause, code))
          throwBusinessError({ code, category: "conflict" });
      throw cause;
    }
  }
  async history(
    categoryId: string,
    productId: string,
    page: number,
    pageSize: number,
  ) {
    const rows = await this.db.all<
      Omit<SharedStockHistory, "before" | "after"> & {
        beforeJson: string | null;
        afterJson: string;
      }
    >(sql`
    WITH members AS (SELECT event_id,product_id FROM product_stock_members WHERE stock_id=(SELECT stock_id FROM product_stock_members WHERE event_id=${categoryId} AND product_id=${productId})),
    history AS (
      SELECT a.id,coalesce(json_extract(a.after_json,'$.productName'),'') productName,e.name categoryName,a.action,a.actor_name actorName,a.occurred_at occurredAt,a.before_json beforeJson,a.after_json afterJson
      FROM product_stock_audit a JOIN events e ON e.id=a.event_id
      WHERE EXISTS(SELECT 1 FROM members m WHERE m.event_id=a.event_id AND m.product_id=json_extract(a.after_json,'$.productId'))
      UNION ALL
      SELECT a.id||'-'||json_extract(i.value,'$.id'),json_extract(i.value,'$.name'),e.name,'withdrawal',a.actor_name,a.occurred_at,
       json_object('quantity',coalesce((SELECT json_extract(w.value,'$.quantity') FROM json_each(a.before_json,'$.withdrawals') w WHERE json_extract(w.value,'$.productId')=json_extract(i.value,'$.id')),0)),
       json_object('quantity',coalesce((SELECT json_extract(w.value,'$.quantity') FROM json_each(a.after_json,'$.withdrawals') w WHERE json_extract(w.value,'$.productId')=json_extract(i.value,'$.id')),0))
      FROM event_audit a JOIN events e ON e.id=a.event_id,json_each(a.after_json,'$.items') i
      WHERE a.resource_type='order' AND e.kind='product_category'
      AND EXISTS(SELECT 1 FROM members m WHERE m.event_id=a.event_id AND m.product_id=json_extract(i.value,'$.id'))
      AND coalesce((SELECT json_extract(w.value,'$.quantity') FROM json_each(a.before_json,'$.withdrawals') w WHERE json_extract(w.value,'$.productId')=json_extract(i.value,'$.id')),0)
       !=coalesce((SELECT json_extract(w.value,'$.quantity') FROM json_each(a.after_json,'$.withdrawals') w WHERE json_extract(w.value,'$.productId')=json_extract(i.value,'$.id')),0)
      UNION ALL
      SELECT l.id,'','',l.action,l.actor_name,l.occurred_at,l.before_json,l.after_json FROM product_stock_links l
      WHERE EXISTS(SELECT 1 FROM members m,json_each(l.context_json) c WHERE m.event_id=json_extract(c.value,'$.eventId') AND m.product_id=json_extract(c.value,'$.productId'))
    ) SELECT * FROM history ORDER BY occurredAt DESC,id DESC LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
   `);
    return {
      items: rows
        .slice(0, pageSize)
        .map(({ beforeJson, afterJson, ...row }) => ({
          ...row,
          before: beforeJson ? JSON.parse(beforeJson) : null,
          after: JSON.parse(afterJson),
        })),
      hasMore: rows.length > pageSize,
    };
  }
}
