import type { Session } from "@/server/auth/models/session.model";
import type { Event } from "@/server/events/models/event.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import type { StockProductImport } from "../inputs/stock-import.input";
import {
  stockContext,
  type StockMember,
  type StockLinkOperation,
} from "../models/shared-stock.model";
import { checkStockMembers } from "./shared-stock-access";
export class PrepareStockImportsUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly shared: SharedStockRepository,
  ) {}
  async execute(
    session: Session | null,
    destination: Event,
    imports: StockProductImport[],
    current?: Event,
  ): Promise<StockLinkOperation[]> {
    if (!imports.length) return [];
    const actor = checkEventAccessWrite(session, destination).user;
    if (destination.kind !== "product_category") return eventMissing();
    const used = new Set<string>();
    const operations: StockLinkOperation[] = [];
    for (const ref of imports) {
      const product = destination.products.find((p) => p.id === ref.productId);
      if (
        !product ||
        ref.sourceCategoryId === destination.id ||
        current?.products.some((p) => p.id === ref.productId)
      )
        return eventMissing();
      const source = await this.events.find(ref.sourceCategoryId);
      if (
        !source ||
        source.kind !== "product_category" ||
        !source.products.some((p) => p.id === ref.sourceProductId)
      )
        return eventMissing();
      checkEventAccessWrite(session, source);
      const members = await this.shared.members(source.id, [
        ref.sourceProductId,
      ]);
      checkStockMembers(session, members, true);
      const selected = members.find(
        (m) => m.eventId === source.id && m.productId === ref.sourceProductId,
      );
      if (
        !selected ||
        selected.stockId !== ref.sourceStockId ||
        stockContext(members) !== ref.context ||
        selected.quantity !== ref.expectedQuantity
      )
        throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
      if (
        used.has(selected.stockId) ||
        members.some((m) => m.eventId === destination.id)
      )
        throwBusinessError({
          code: "STOCK_IMPORT_DUPLICATE",
          category: "conflict",
        });
      used.add(selected.stockId);
      if (await this.shared.findOperation(ref.operationId))
        throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
      const added: StockMember = {
        eventId: destination.id,
        productId: product.id,
        stockId: `${destination.id}:${product.id}`,
        revision: 1,
        eventVersion: destination.version,
        categoryName: destination.name,
        productName: product.name,
        cashBoxId: destination.cashBoxId,
        quantity: 0,
      };
      const before = [...members, added];
      operations.push({
        id: ref.operationId,
        action: "link",
        eventId: source.id,
        productId: ref.sourceProductId,
        sourceStockId: selected.stockId,
        targetStockId: added.stockId,
        targetEventId: destination.id,
        targetProductId: product.id,
        quantity: 0,
        expectedQuantity: selected.quantity,
        targetQuantity: 0,
        contextJson: stockContext(before),
        actorId: actor.id,
        actorName: actor.name,
        occurredAt: destination.updatedAt,
        fingerprint: JSON.stringify({
          operation: "importStockProduct",
          requestId: destination.lastOperation,
          ...ref,
        }),
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(
          before.map((m) => ({
            ...m,
            stockId: selected.stockId,
            revision: m.revision + 1,
            quantity: selected.quantity,
          })),
        ),
      });
    }
    return operations;
  }
}
