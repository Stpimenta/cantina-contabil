import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
import { deliveryRoutes } from "./delivery-route.schema";
import { eventOrders } from "@/server/events/infrastructure/event-order.schema";
export const deliveryStops = sqliteTable("delivery_stops", {
  orderId: text("order_id")
    .primaryKey()
    .references(() => eventOrders.id),
  routeId: text("route_id")
    .notNull()
    .references(() => deliveryRoutes.id),
  position: integer("position").notNull(),
});
