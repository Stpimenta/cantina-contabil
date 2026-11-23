import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { sharedStockAccess } from "./shared-stock-access";
import { validateStockEntryCursor } from "../inputs/stock.input";
import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { validateEventId } from "@/server/events/inputs/event-query.input";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
export class LoadStockEntriesUseCase {
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
    const cursor = parseInput(validateStockEntryCursor(input));
    const category = await this.events.find(id);
    if (!category || !category.products.some((p) => p.id === productId))
      return eventMissing();
    checkEventRead(session, category);
    await sharedStockAccess(session, this.shared, id, [productId], false);
    const rows = await this.stock.entriesBefore(
      id,
      productId,
      cursor,
      DEFAULT_PAGE_SIZE + 1,
    );
    const items = rows.slice(0, DEFAULT_PAGE_SIZE);
    const last = items.at(-1);
    return {
      items,
      hasMore: rows.length > DEFAULT_PAGE_SIZE,
      cursor: last ? { createdAt: last.createdAt, id: last.id } : cursor,
    };
  }
}
