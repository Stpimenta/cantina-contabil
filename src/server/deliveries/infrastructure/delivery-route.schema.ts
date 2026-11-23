import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
import { deliveryDrivers } from "./driver.schema";
export const deliveryRoutes = sqliteTable("delivery_routes", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  driverId: text("driver_id")
    .notNull()
    .references(() => deliveryDrivers.id),
  name: text("name").notNull(),
  payloadJson: text("payload_json").notNull(),
  startedAt: text("started_at"),
  cancelled: integer("cancelled", { mode: "boolean" }).notNull(),
  version: integer("version").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  lastOperation: text("last_operation").notNull(),
  fingerprint: text("fingerprint").notNull(),
});
