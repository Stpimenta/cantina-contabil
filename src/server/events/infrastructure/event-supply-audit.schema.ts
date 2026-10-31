import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "./event.schema";
import { eventSupplies } from "./event-supply.schema";
export const eventSupplyAudit = sqliteTable("event_supply_audit", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  supplyId: text("supply_id")
    .notNull()
    .references(() => eventSupplies.id),
  cashBoxId: text("cash_box_id"),
  action: text("action", { enum: ["create", "update"] }).notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  occurredAt: text("occurred_at").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json").notNull(),
});
