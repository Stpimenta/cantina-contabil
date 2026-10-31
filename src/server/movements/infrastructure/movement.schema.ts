import type { MovementReceipt } from "../models/movement-receipt.model";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";
export const movements = sqliteTable("cash_movements", {
  id: text("id").primaryKey().notNull(),
  cashBoxId: text("cash_box_id")
    .notNull()
    .references(() => cashBoxes.id),
  cashBoxName: text("cash_box_name").notNull(),
  direction: text("direction").$type<"incoming" | "outgoing">().notNull(),
  amountCents: integer("amount_cents").notNull(),
  occurredOn: text("occurred_on").notNull(),
  reason: text("reason").notNull(),
  receipts: text("receipts_json", { mode: "json" })
    .$type<MovementReceipt[]>()
    .notNull()
    .default([]),
  version: integer("version").notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  deletedAt: text("deleted_at"),
  deletedBy: integer("deleted_by"),
  deletedByName: text("deleted_by_name"),
});
