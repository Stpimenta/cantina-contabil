import { throwBusinessError } from "@/shared/errors/business-error";
import type { StockShortage } from "@/shared/errors/business-failure";
import type { OrderItem } from "@/server/events/models/order-item.model";
export function stockShortages(
  items: OrderItem[],
  withdrawals: { productId: string; quantity: number }[],
  previous: { productId: string; quantity: number }[],
  balances: { productId: string; quantity: number; stockId?: string }[],
): StockShortage[] {
  const groups = new Map<
    string,
    { ids: string[]; requested: bigint; available: number }
  >();
  for (const productId of new Set(
    [...withdrawals, ...previous].map((w) => w.productId),
  )) {
    const balance = balances.find((b) => b.productId === productId);
    const key = balance?.stockId ?? productId;
    const group = groups.get(key) ?? {
      ids: [],
      requested: 0n,
      available: balance?.quantity ?? 0,
    };
    group.ids.push(productId);
    group.requested +=
      BigInt(
        withdrawals.find((w) => w.productId === productId)?.quantity ?? 0,
      ) -
      BigInt(previous.find((w) => w.productId === productId)?.quantity ?? 0);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) => {
    if (group.requested <= BigInt(group.available)) return [];
    if (group.requested > BigInt(Number.MAX_SAFE_INTEGER))
      throwBusinessError({ code: "STOCK_LIMIT", category: "conflict" });
    const products = items.filter((i) => group.ids.includes(i.id));
    const item = products[0];
    if (!item) return [];
    return [
      {
        productId: item.id,
        productName: products.map((i) => i.name).join(" / "),
        requested: Number(group.requested),
        available: group.available,
        missing: Number(group.requested) - group.available,
      },
    ];
  });
}
