import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { validateEventId } from "@/server/events/inputs/event-query.input";
import { eventMissing } from "@/server/events/models/event-rules";
import { throwBusinessError } from "@/shared/errors/business-error";
export class CheckProductRemovalUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
  ) {}
  async execute(
    session: Session | null,
    categoryInput: unknown,
    productInput: unknown,
  ) {
    checkAccess(session);
    const categoryId = parseInput(validateEventId(categoryInput));
    const productId = parseInput(validateEventId(productInput));
    const category = await this.events.find(categoryId);
    if (!category) return eventMissing();
    checkEventAccessWrite(session, category);
    if (!category.products.some((p) => p.id === productId))
      return eventMissing();
    if (await this.stock.productInUse(categoryId, productId))
      throwBusinessError({
        code: "STOCK_PRODUCT_IN_USE",
        category: "conflict",
      });
    return { productId };
  }
}
