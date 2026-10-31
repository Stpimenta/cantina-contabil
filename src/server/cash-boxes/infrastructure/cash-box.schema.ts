import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Existing D1 table. Constraints, indexes and triggers are owned by migrations/.
export const cashBoxes = sqliteTable("cash_boxes", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  deletedAt: text("deleted_at"),
  deletedBy: integer("deleted_by"),
  deletedByName: text("deleted_by_name"),
  version: integer("version").notNull().default(1),
});
