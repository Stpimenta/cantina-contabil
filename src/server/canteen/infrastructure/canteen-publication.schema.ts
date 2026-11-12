import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
export const canteenPublications = sqliteTable("canteen_publications", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  deadline: integer("deadline").notNull(),
  state: text("state", {
    enum: ["armed", "committed", "cancelled", "published"],
  }).notNull(),
  orderId: text("order_id"),
  version: integer("version"),
  kind: text("kind").notNull().default("order"),
});
