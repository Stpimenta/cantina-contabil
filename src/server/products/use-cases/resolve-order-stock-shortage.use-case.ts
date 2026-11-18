import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { eventMissing } from "@/server/events/models/event-rules";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import { validateStockEntry } from "../inputs/stock.input";
import { stockShortages } from "../models/stock-shortages";
import type { SaveStockEntryUseCase } from "./save-stock-entry.use-case";

export class ResolveOrderStockShortageUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
    private readonly saveEntry: SaveStockEntryUseCase,
  ) {}

  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateStockEntry(input));
    const category = await this.events.find(data.categoryId);
    if (!category || category.kind !== "product_category")
      return eventMissing();
    checkEventAccessWrite(session, category);
    const order = data.orderId
      ? await this.events.findOrder(data.orderId)
      : null;
    if (!order || order.eventId !== category.id || data.expectedVersion !== 0)
      return eventMissing();
    const desired = order.items.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));
    const existing = await this.stock.findEntry(data.entryId);
    if (!existing) {
      const shortages = stockShortages(
        order.items,
        desired,
        order.withdrawals ?? [],
        await this.stock.balances(category.id),
      );
      const missing = shortages.find(
        (item) => item.productId === data.productId,
      )?.missing;
      if (missing !== data.quantity)
        throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    }
    // The existing entry flow provides authorization, idempotency and stock audit.
    // Its fingerprint retains orderId as the source of this physical-stock attestation.
    await this.saveEntry.execute(session, data);
    const current = await this.events.findOrder(order.id);
    if (!current || current.version !== order.version)
      throwBusinessError({ code: "EVENT_CHANGED", category: "conflict" });
    return stockShortages(
      current.items,
      desired,
      current.withdrawals ?? [],
      await this.stock.balances(category.id),
    );
  }
}
