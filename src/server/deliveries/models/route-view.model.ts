import type { DeliveryRoute } from "./delivery-route.model";
import type { DeliveryOrder } from "./delivery-order.model";
export type RouteView = DeliveryRoute & { orders: DeliveryOrder[] };
