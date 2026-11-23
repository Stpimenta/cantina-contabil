import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const deliveryDrivers = sqliteTable("delivery_drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  version: integer("version").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  lastOperation: text("last_operation").notNull(),
  fingerprint: text("fingerprint").notNull(),
});
