import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { canAlterEvent, canReadEvent } from "@/shared/auth/access-policy";
import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { validateEventId } from "@/server/events/inputs/event-query.input";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
export class GetProductStockUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
    private readonly shared?: SharedStockRepository,
  ) {}
  async execute(session: Session | null, idInput: unknown) {
    const access = checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const category = await this.events.find(id);
    if (!category) return eventMissing();
    checkEventRead(session, category);
    const members = this.shared
      ? await this.shared.members(
          id,
          category.products.map((p) => p.id),
        )
      : [];
    const balances = await this.stock.balances(id);
    // Physical balances remain the source for replenishment and withdrawals.
    // Pending demand only reduces what is free for new orders.
    const demandByCategory = new Map<
      string,
      Awaited<ReturnType<ProductStockRepository["productionDemand"]>>
    >();
    if (category.kind === "product_category") {
      const categoryIds = [...new Set([id, ...members.map((m) => m.eventId)])];
      const demand = await Promise.all(
        categoryIds.map(async (categoryId) => ({
          categoryId,
          rows: await this.stock.productionDemand(categoryId),
        })),
      );
      for (const result of demand)
        demandByCategory.set(result.categoryId, result.rows);
    }
    return balances.map((balance) => {
      const member = members.find(
        (m) => m.eventId === id && m.productId === balance.productId,
      );
      const group = member
        ? members.filter((m) => m.stockId === member.stockId)
        : [];
      const pending = (
        group.length ? group : [{ eventId: id, productId: balance.productId }]
      ).reduce(
        (sum, item) =>
          sum +
          (demandByCategory
            .get(item.eventId)
            ?.find((row) => row.productId === item.productId)?.allPending ?? 0),
        0,
      );
      if (!Number.isSafeInteger(pending) || pending < 0)
        throw new Error("Invalid pending stock quantity");
      return {
        ...balance,
        availableQuantity: Math.max(0, balance.quantity - pending),
        shared: group.length > 1,
        writable: group.every((m) =>
          canAlterEvent(access, { id: m.eventId, cashBoxId: m.cashBoxId }),
        ),
        readable: group.every((m) =>
          canReadEvent(access, { id: m.eventId, cashBoxId: m.cashBoxId }),
        ),
      };
    });
  }
}
