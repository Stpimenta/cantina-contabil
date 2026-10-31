import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { cashBoxes } from "./cash-box.schema";

// Written by database triggers; repositories only read this table.
export const cashBoxAudit = sqliteTable("cash_box_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cashBoxId: text("cash_box_id")
    .notNull()
    .references(() => cashBoxes.id),
  action: text("action", { enum: ["create", "update", "delete"] }).notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  occurredAt: text("occurred_at").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json").notNull(),
});
