import type { StockShortage } from "@/shared/errors/business-failure";
import type { OrderItem } from "@/server/events/models/order-item.model";

export function stockShortages(
  items: OrderItem[],
  withdrawals: { productId: string; quantity: number }[],
  previous: { productId: string; quantity: number }[],
  balances: { productId: string; quantity: number }[],
): StockShortage[] {
  return items.flatMap((item) => {
    const requested =
      (withdrawals.find((w) => w.productId === item.id)?.quantity ?? 0) -
      (previous.find((w) => w.productId === item.id)?.quantity ?? 0);
    const available =
      balances.find((b) => b.productId === item.id)?.quantity ?? 0;
    return requested > available
      ? [
          {
            productId: item.id,
            productName: item.name,
            requested,
            available,
            missing: requested - available,
          },
        ]
      : [];
  });
}
