import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { events } from "./event.schema";
export const eventStockOpeningCommitments = sqliteTable(
  "event_stock_opening_commitments",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    productId: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.productId] })],
);
