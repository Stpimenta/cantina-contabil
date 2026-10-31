import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { events } from "./event.schema";
export const eventProducts = sqliteTable(
  "event_products",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    version: integer("version").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.version, t.id] })],
);
