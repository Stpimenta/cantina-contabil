import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";
export const events = sqliteTable("events", {
  deletedAt: text("deleted_at"),
  deletedBy: integer("deleted_by"),
  deletedByName: text("deleted_by_name"),
  id: text("id").primaryKey(),
  cashBoxId: text("cash_box_id")
    .notNull()
    .references(() => cashBoxes.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  occursOn: text("occurs_on").notNull(),
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
