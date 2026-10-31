import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "./event.schema";
export const eventAudit = sqliteTable("event_audit", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  resourceId: text("resource_id").notNull(),
  resourceType: text("resource_type", { enum: ["event", "order"] }).notNull(),
  action: text("action", { enum: ["create", "update"] }).notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  occurredAt: text("occurred_at").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json").notNull(),
});
