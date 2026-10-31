import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";

// Existing D1 table. Constraints, indexes and triggers are owned by migrations/.
export const donations = sqliteTable("donations", {
  id: text("id").notNull().primaryKey(),
  cashBoxId: text("cash_box_id")
    .notNull()
    .references(() => cashBoxes.id),
  amountCents: integer("amount_cents").notNull(),
  donatedOn: text("donated_on").notNull(),
  donorName: text("donor_name").notNull().default(""),
  note: text("note").notNull().default(""),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  deletedAt: text("deleted_at"),
  deletedBy: integer("deleted_by"),
  deletedByName: text("deleted_by_name"),
});
