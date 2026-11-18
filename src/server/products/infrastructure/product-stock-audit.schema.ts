import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
import { productStockEntries } from "./product-stock-entry.schema";
export const productStockAudit = sqliteTable("product_stock_audit", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  entryId: text("entry_id")
    .notNull()
    .references(() => productStockEntries.id),
  action: text("action", { enum: ["create", "update"] }).notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  occurredAt: text("occurred_at").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json").notNull(),
});
