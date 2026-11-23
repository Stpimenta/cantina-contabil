import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
export const productStockMembers = sqliteTable(
  "product_stock_members",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    productId: text("product_id").notNull(),
    stockId: text("stock_id").notNull(),
    revision: integer("revision").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.productId] })],
);
