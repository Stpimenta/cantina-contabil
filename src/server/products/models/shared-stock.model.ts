export interface StockMember {
  eventId: string;
  productId: string;
  stockId: string;
  revision: number;
  eventVersion: number;
  categoryName: string;
  productName: string;
  cashBoxId: string;
  quantity: number;
}
export type StockContext = Pick<
  StockMember,
  "eventId" | "productId" | "stockId" | "revision" | "eventVersion"
>[];
export function stockContext(members: StockMember[]): string {
  return JSON.stringify(
    members
      .map(({ eventId, productId, stockId, revision, eventVersion }) => ({
        eventId,
        productId,
        stockId,
        revision,
        eventVersion,
      }))
      .sort(
        (a, b) =>
          a.eventId.localeCompare(b.eventId) ||
          a.productId.localeCompare(b.productId),
      ),
  );
}
export interface StockLinkOperation {
  id: string;
  action: "link" | "unlink";
  eventId: string;
  productId: string;
  targetEventId: string | null;
  targetProductId: string | null;
  sourceStockId: string;
  targetStockId: string | null;
  quantity: number;
  expectedQuantity: number;
  targetQuantity: number;
  contextJson: string;
  actorId: number;
  actorName: string;
  occurredAt: string;
  fingerprint: string;
  beforeJson: string;
  afterJson: string;
}
export interface SharedStockHistory {
  id: string;
  productName: string;
  categoryName: string;
  action: string;
  actorName: string;
  occurredAt: string;
  before: unknown;
  after: unknown;
}

export function changedStockProducts(
  next: { productId: string; quantity: number }[],
  previous: { productId: string; quantity: number }[],
) {
  return [...new Set([...next, ...previous].map((w) => w.productId))].filter(
    (id) =>
      (next.find((w) => w.productId === id)?.quantity ?? 0) !==
      (previous.find((w) => w.productId === id)?.quantity ?? 0),
  );
}
