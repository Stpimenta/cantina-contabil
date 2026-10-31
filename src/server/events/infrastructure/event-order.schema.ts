import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "./event.schema";
export const eventOrders = sqliteTable("event_orders", {
  deletedAt: text("deleted_at"),
  deletedBy: integer("deleted_by"),
  deletedByName: text("deleted_by_name"),
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  customerName: text("customer_name").notNull(),
  note: text("note").notNull(),
  totalCents: integer("total_cents").notNull(),
  paid: integer("paid", { mode: "boolean" }).notNull(),
  catalogVersion: integer("catalog_version").notNull(),
  version: integer("version").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  lastOperation: text("last_operation").notNull(),
  fingerprint: text("fingerprint").notNull(),
  payloadJson: text("payload_json").notNull(),
});
