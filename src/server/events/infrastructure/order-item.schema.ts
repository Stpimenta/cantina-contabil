import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { eventOrders } from "./event-order.schema";
export const orderItems = sqliteTable(
  "event_order_items",
  {
    orderId: text("order_id")
      .notNull()
      .references(() => eventOrders.id),
    version: integer("version").notNull(),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.version, t.productId] })],
);
