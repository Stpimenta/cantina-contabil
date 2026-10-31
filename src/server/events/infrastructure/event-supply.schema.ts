import type { EventSupplyReceipt } from "../models/event-supply-receipt.model";
import type { ProductIconId } from "@/shared/products/product-icons";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "./event.schema";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";
export const eventSupplies = sqliteTable("event_supplies", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  name: text("name").notNull(),
  donorName: text("donor_name").notNull().default(""),
  description: text("description").notNull().default(""),
  icon: text("icon").$type<ProductIconId>().notNull(),
  amountCents: integer("amount_cents").notNull(),
  source: text("source", { enum: ["purchase", "donation"] }).notNull(),
  cashBoxId: text("cash_box_id").references(() => cashBoxes.id),
  cashBoxName: text("cash_box_name"),
  received: integer("received", { mode: "boolean" }).notNull(),
  receipts: text("receipts_json", { mode: "json" })
    .$type<EventSupplyReceipt[]>()
    .notNull()
    .default([]),
  receiptKey: text("receipt_key"),
  receiptType: text("receipt_type"),
  version: integer("version").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").notNull(),
  updatedByName: text("updated_by_name").notNull(),
  deletedAt: text("deleted_at"),
  deletedBy: integer("deleted_by"),
  deletedByName: text("deleted_by_name"),
  fingerprint: text("fingerprint").notNull(),
});
