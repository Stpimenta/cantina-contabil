import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
import { productStockLinks } from "./product-stock-link.schema";
export const productStockTransfers = sqliteTable(
  "product_stock_transfers",
  {
    operationId: text("operation_id")
      .notNull()
      .references(() => productStockLinks.id),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    productId: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.operationId, t.eventId, t.productId] })],
);
