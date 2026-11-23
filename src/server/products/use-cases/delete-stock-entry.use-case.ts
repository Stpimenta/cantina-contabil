import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { sharedStockAccess } from "./shared-stock-access";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { checkRepeat, eventMissing } from "@/server/events/models/event-rules";
import { validateDeleteStockEntry } from "../inputs/stock.input";
export class DeleteStockEntryUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
    private readonly shared?: SharedStockRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateDeleteStockEntry(input));
    const category = await this.events.find(data.categoryId);
    if (!category) return eventMissing();
    const actor = checkEventAccessWrite(session, category).user;
    const stockAccess = await sharedStockAccess(
      session,
      this.shared,
      category.id,
      [data.productId],
      true,
    );
    const current = await this.stock.findEntry(data.entryId);
    if (
      !current ||
      !(
        (current.eventId === category.id &&
          current.productId === data.productId) ||
        stockAccess.members.some(
          (m) =>
            m.eventId === current.eventId && m.productId === current.productId,
        )
      )
    )
      return eventMissing();
    const fingerprint = JSON.stringify({
      operation: "deleteStockEntry",
      ...data,
    });
    if (checkRepeat(current, data.requestId, fingerprint, actor.id))
      return current;
    if (current.deletedAt || current.version !== data.expectedVersion)
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    const balances = await this.stock.balances(category.id);
    if (
      (balances.find((b) => b.productId === data.productId)?.quantity ?? 0) <
      current.quantity
    )
      throwBusinessError({
        code: "STOCK_ENTRY_REDUCTION_BLOCKED",
        category: "conflict",
      });
    const now = new Date().toISOString();
    const entry = {
      ...current,
      stockContext: stockAccess.context ?? null,
      deletedAt: now,
      deletedBy: actor.id,
      deletedByName: actor.name,
      version: current.version + 1,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
      lastOperation: data.requestId,
      fingerprint,
    };
    if (!(await this.stock.saveEntry(entry, current.version))) {
      const saved = await this.stock.findEntry(entry.id);
      if (checkRepeat(saved, data.requestId, fingerprint, actor.id))
        return saved!;
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    }
    return entry;
  }
}
