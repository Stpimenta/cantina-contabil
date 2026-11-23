import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { sharedStockAccess } from "./shared-stock-access";
import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import {
  validateEventId,
  validateEventQuery,
} from "@/server/events/inputs/event-query.input";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
export class ListStockEntriesUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
    private readonly shared?: SharedStockRepository,
  ) {}
  async execute(
    session: Session | null,
    idInput: unknown,
    productInput: unknown,
    input: unknown,
  ) {
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const productId = parseInput(validateEventId(productInput));
    const data = parseInput(validateEventQuery(input));
    const category = await this.events.find(id);
    if (!category || !category.products.some((p) => p.id === productId))
      return eventMissing();
    checkEventRead(session, category);
    await sharedStockAccess(session, this.shared, id, [productId], false);
    return this.stock.entries(id, productId, data.page, DEFAULT_PAGE_SIZE);
  }
}
