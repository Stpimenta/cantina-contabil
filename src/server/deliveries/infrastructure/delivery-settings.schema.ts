import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
export const deliverySettings = sqliteTable("delivery_settings", {
  eventId: text("event_id")
    .primaryKey()
    .references(() => events.id),
  payloadJson: text("payload_json").notNull(),
  version: integer("version").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  lastOperation: text("last_operation").notNull(),
  fingerprint: text("fingerprint").notNull(),
});
