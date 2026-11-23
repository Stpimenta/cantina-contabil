import { checkAccess } from "@/shared/auth/check-access";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { stockContext, type StockMember } from "../models/shared-stock.model";
import { validateSharedStock } from "../inputs/shared-stock.input";
import { checkStockMembers } from "./shared-stock-access";
export class ManageSharedStockUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly shared: SharedStockRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    const actor = checkAccess(session).user;
    const data = parseInput(validateSharedStock(input));
    const event = await this.events.find(data.categoryId);
    if (
      !event ||
      event.kind !== "product_category" ||
      !event.products.some((p) => p.id === data.productId)
    )
      return eventMissing();
    checkEventAccessWrite(session, event);
    const fingerprint = JSON.stringify(data);
    const previous = await this.shared.findOperation(data.requestId);
    if (previous) {
      checkStockMembers(
        session,
        await this.shared.members(data.categoryId, [data.productId]),
        true,
      );
      const before = JSON.parse(previous.beforeJson) as StockMember[];
      checkStockMembers(session, before, true);
      if (previous.actorId !== actor.id || previous.fingerprint !== fingerprint)
        throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
      return { categoryId: event.id };
    }
    const source = await this.shared.members(event.id, [data.productId]);
    const selected = source.find(
      (m) => m.eventId === event.id && m.productId === data.productId,
    );
    if (!selected) return eventMissing();
    let target: StockMember[] = [];
    if (data.action === "link") {
      const targetEvent = await this.events.find(data.targetCategoryId!);
      if (
        !targetEvent ||
        targetEvent.kind !== "product_category" ||
        !targetEvent.products.some((p) => p.id === data.targetProductId)
      )
        return eventMissing();
      checkEventAccessWrite(session, targetEvent);
      target = await this.shared.members(targetEvent.id, [
        data.targetProductId!,
      ]);
      if (!target.length || target[0].stockId === selected.stockId)
        throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    } else if (source.length < 2 || data.quantity > selected.quantity)
      throwBusinessError({
        code: "INVALID_STOCK_INPUT",
        category: "validation",
        issues: { quantity: "INVALID_AMOUNT" },
      });
    const members = [...source, ...target];
    checkStockMembers(session, members, true);
    const context = stockContext(members);
    if (
      context !== data.context ||
      selected.quantity !== data.expectedQuantity ||
      (target[0]?.quantity ?? 0) !== data.targetQuantity
    )
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    const total = BigInt(selected.quantity) + BigInt(target[0]?.quantity ?? 0);
    if (total > BigInt(Number.MAX_SAFE_INTEGER))
      throwBusinessError({ code: "STOCK_LIMIT", category: "conflict" });
    const after = members.map((m) => ({
      ...m,
      revision: m.revision + 1,
      stockId:
        data.action === "link"
          ? selected.stockId
          : m.eventId === event.id && m.productId === data.productId
            ? data.requestId
            : m.stockId,
      quantity:
        data.action === "link"
          ? Number(total)
          : m.eventId === event.id && m.productId === data.productId
            ? data.quantity
            : selected.quantity - data.quantity,
    }));
    await this.shared.saveOperation({
      id: data.requestId,
      action: data.action,
      eventId: event.id,
      productId: data.productId,
      targetEventId: data.targetCategoryId ?? null,
      targetProductId: data.targetProductId ?? null,
      sourceStockId: selected.stockId,
      targetStockId: target[0]?.stockId ?? null,
      quantity: data.quantity,
      expectedQuantity: selected.quantity,
      targetQuantity: target[0]?.quantity ?? 0,
      contextJson: context,
      actorId: actor.id,
      actorName: actor.name,
      occurredAt: new Date().toISOString(),
      fingerprint,
      beforeJson: JSON.stringify(members),
      afterJson: JSON.stringify(after),
    });
    const saved = await this.shared.findOperation(data.requestId);
    if (
      !saved ||
      saved.fingerprint !== fingerprint ||
      saved.actorId !== actor.id
    )
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    return { categoryId: event.id };
  }
}
