import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import {
  checkRepeat,
  eventMissing,
  eventChanged,
  checkEventWrite,
} from "@/server/events/models/event-rules";
import { validateWithdrawal } from "../inputs/stock.input";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
export class SaveOrderWithdrawalUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateWithdrawal(input));
    const category = await this.events.find(data.categoryId);
    if (!category || category.kind !== "product_category")
      return eventMissing();
    const actor = checkEventAccessWrite(session, category).user;
    const current = await this.events.findOrder(data.orderId);
    if (!current || current.eventId !== category.id) return eventMissing();
    const fingerprint = JSON.stringify({ operation: "withdrawal", ...data });
    if (checkRepeat(current, data.requestId, fingerprint, actor.id))
      return current;
    if (current.version !== data.expectedVersion) return eventChanged();
    if (
      data.withdrawals.length !== current.items.length ||
      data.withdrawals.some(
        (w) =>
          !current.items.some(
            (i) => i.id === w.productId && w.quantity <= i.quantity,
          ),
      )
    )
      throwBusinessError({
        code: "WITHDRAWAL_ABOVE_ORDERED",
        category: "conflict",
      });
    const allZero = data.withdrawals.every((w) => w.quantity === 0);
    const allFull = current.items.every((item) =>
      data.withdrawals.some(
        (w) => w.productId === item.id && w.quantity === item.quantity,
      ),
    );
    if (!allZero && !allFull)
      throwBusinessError({
        code: "INVALID_STOCK_INPUT",
        issues: { withdrawals: "INVALID_FULFILLMENT_STATUS" },
        category: "validation",
      });
    const balances = await this.stock.balances(category.id);
    if (
      data.withdrawals.some(
        (w) =>
          w.quantity -
            (current.withdrawals?.find((old) => old.productId === w.productId)
              ?.quantity ?? 0) >
          (balances.find((b) => b.productId === w.productId)?.quantity ?? 0),
      )
    )
      throwBusinessError({ code: "STOCK_INSUFFICIENT", category: "conflict" });
    const order = {
      ...current,
      withdrawals: data.withdrawals,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id,
      updatedByName: actor.name,
      lastOperation: data.requestId,
      fingerprint,
    };
    const outcome = await this.events.updateOrder(
      order,
      current.version,
      category.version,
    );
    if (outcome === "stale") {
      const saved = await this.events.findOrder(current.id);
      if (checkRepeat(saved, data.requestId, fingerprint, actor.id))
        return saved!;
    }
    checkEventWrite(outcome);
    return order;
  }
}
