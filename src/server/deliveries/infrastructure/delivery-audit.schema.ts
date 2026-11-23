import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const deliveryAudit = sqliteTable("delivery_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  eventId: text("event_id"),
  occurredAt: text("occurred_at").notNull(),
  actorId: integer("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json").notNull(),
});
