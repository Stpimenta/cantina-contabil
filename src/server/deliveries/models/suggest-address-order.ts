import type { DeliveryOrder } from "./delivery-order.model";
// Address-text grouping only. No geocoding, distance, traffic or road routing.
// Missing addresses keep their exact manual slots. Stable ties keep manual order.
export function suggestAddressOrder(orders: DeliveryOrder[]): DeliveryOrder[] {
  const located = orders
    .filter((o) => o.address?.street)
    .slice()
    .sort((a, b) => {
      for (const key of [
        "state",
        "city",
        "neighborhood",
        "street",
        "number",
      ] as const) {
        const difference = a.address![key].localeCompare(
          b.address![key],
          "pt-BR",
          { sensitivity: "base", numeric: true },
        );
        if (difference) return difference;
      }
      return 0;
    });
  let index = 0;
  return orders.map((o) => (o.address?.street ? located[index++]! : o));
}
