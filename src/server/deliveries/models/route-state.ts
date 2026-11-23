import type { DeliveryRoute } from "./delivery-route.model";
import type { DeliveryOrder } from "./delivery-order.model";
export const routeState = (
  route: Pick<DeliveryRoute, "startedAt"> & {
    orders: Pick<DeliveryOrder, "fulfilled">[];
  },
) =>
  route.orders.length > 0 && route.orders.every((o) => o.fulfilled)
    ? "completed"
    : route.startedAt
      ? "started"
      : "ready";
