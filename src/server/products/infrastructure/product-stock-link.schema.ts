import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
export const productStockLinks = sqliteTable("product_stock_links", {
  id: text("id").primaryKey(),
  action: text("action").notNull().$type<"link" | "unlink">(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  productId: text("product_id").notNull(),
  targetEventId: text("target_event_id"),
  targetProductId: text("target_product_id"),
  sourceStockId: text("source_stock_id").notNull(),
  targetStockId: text("target_stock_id"),
  quantity: integer("quantity").notNull(),
  expectedQuantity: integer("expected_quantity").notNull(),
  targetQuantity: integer("target_quantity").notNull(),
  contextJson: text("context_json").notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  occurredAt: text("occurred_at").notNull(),
  fingerprint: text("fingerprint").notNull(),
  beforeJson: text("before_json").notNull(),
  afterJson: text("after_json").notNull(),
});
