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
  ) {}
  async execute(session: Session | null, idInput: unknown) {
    const access = checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const category = await this.events.find(id);
    if (!category) return eventMissing();
    checkEventRead(session, category);
    const positions = await this.stock.positions(id);
    return positions
      .filter((p) => p.eventId === id)
      .map((position) => {
        const group = positions.filter((p) => p.stockId === position.stockId);
        const pending = group.reduce((sum, p) => sum + p.allPending, 0);
        if (!Number.isSafeInteger(pending) || pending < 0)
          throw new Error("Invalid pending stock quantity");
        const shared = group.length > 1;
        return {
          productId: position.productId,
          quantity: position.quantity,
          ...(shared ? { stockId: position.stockId } : {}),
          availableQuantity: Math.max(0, position.quantity - pending),
          shared,
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
