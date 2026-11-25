import type { Event } from "@/server/events/models/event.model";
import type { EventOrder } from "@/server/events/models/event-order.model";

// One physical-stock rule for standard withdrawals, deliveries and canteen collection.
export function orderStockConsumption(
  event: Pick<Event, "deliveryEnabled" | "canteenEnabled">,
  order?: Pick<
    EventOrder,
    "items" | "withdrawals" | "fulfilled" | "collected"
  > | null,
): { productId: string; quantity: number }[] {
  if (!order) return [];
  if (!event.deliveryEnabled && !event.canteenEnabled)
    return order.withdrawals ?? [];
  const completed = event.canteenEnabled ? order.collected : order.fulfilled;
  return completed
    ? order.items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }))
    : [];
}
