import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { checkRepeat, eventMissing } from "@/server/events/models/event-rules";
import { validateStockEntry } from "../inputs/stock.input";
import type { StockEntry } from "../models/stock-entry.model";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
export class SaveStockEntryUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateStockEntry(input));
    const category = await this.events.find(data.categoryId);
    if (!category || !category.products.some((p) => p.id === data.productId))
      return eventMissing();
    const actor = checkEventAccessWrite(session, category).user;
    if (data.orderId) {
      const order = await this.events.findOrder(data.orderId);
      if (
        data.expectedVersion !== 0 ||
        !order ||
        order.eventId !== category.id ||
        !order.items.some((item) => item.id === data.productId)
      )
        return eventMissing();
    }
    const current = await this.stock.findEntry(data.entryId);
    const fingerprint = JSON.stringify(data);
    if (
      current &&
      (current.eventId !== category.id || current.productId !== data.productId)
    )
      return eventMissing();
    if (checkRepeat(current, data.requestId, fingerprint, actor.id))
      return current!;
    if ((current?.version ?? 0) !== data.expectedVersion)
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    if (current?.deletedAt)
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    const balances = await this.stock.balances(category.id);
    const nextBalance =
      BigInt(
        balances.find((b) => b.productId === data.productId)?.quantity ?? 0,
      ) +
      BigInt(data.quantity) -
      BigInt(current?.quantity ?? 0);
    if (nextBalance < 0n)
      throwBusinessError({
        code: "STOCK_ENTRY_REDUCTION_BLOCKED",
        category: "conflict",
      });
    if (nextBalance > BigInt(Number.MAX_SAFE_INTEGER))
      throwBusinessError({ code: "STOCK_LIMIT", category: "conflict" });
    const now = new Date().toISOString();
    const entry: StockEntry = {
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
      id: data.entryId,
      eventId: category.id,
      productId: data.productId,
      quantity: data.quantity,
      version: data.expectedVersion + 1,
      createdAt: current?.createdAt ?? now,
      createdBy: current?.createdBy ?? actor.id,
      createdByName: current?.createdByName ?? actor.name,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
      lastOperation: data.requestId,
      fingerprint,
    };
    if (!(await this.stock.saveEntry(entry, data.expectedVersion))) {
      const saved = await this.stock.findEntry(entry.id);
      if (checkRepeat(saved, data.requestId, fingerprint, actor.id))
        return saved!;
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    }
    return entry;
  }
}
