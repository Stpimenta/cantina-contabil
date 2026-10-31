import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { eventOrders } from "./event-order.schema";
export const orderPayments = sqliteTable(
  "event_order_payments",
  {
    orderId: text("order_id")
      .notNull()
      .references(() => eventOrders.id),
    version: integer("version").notNull(),
    method: text("method", { enum: ["cash", "pix"] }).notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.version, t.method] })],
);
