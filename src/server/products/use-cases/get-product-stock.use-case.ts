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
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const category = await this.events.find(id);
    if (!category || category.kind !== "product_category")
      return eventMissing();
    checkEventRead(session, category);
    return this.stock.balances(id);
  }
}
