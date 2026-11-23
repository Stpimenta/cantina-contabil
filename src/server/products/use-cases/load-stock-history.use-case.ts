import { checkAccess } from "@/shared/auth/check-access";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import {
  validateEventId,
  validateEventQuery,
} from "@/server/events/inputs/event-query.input";
import { eventMissing } from "@/server/events/models/event-rules";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { checkStockMembers } from "./shared-stock-access";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class LoadStockHistoryUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly shared: SharedStockRepository,
  ) {}
  async execute(
    session: Session | null,
    categoryInput: unknown,
    productInput: unknown,
    pageInput: unknown,
  ) {
    checkAccess(session);
    const id = parseInput(validateEventId(categoryInput)),
      productId = parseInput(validateEventId(productInput));
    const { page } = parseInput(validateEventQuery({ page: pageInput }));
    const event = await this.events.find(id);
    if (
      !event ||
      event.kind !== "product_category" ||
      !event.products.some((p) => p.id === productId)
    )
      return eventMissing();
    checkEventRead(session, event);
    checkStockMembers(
      session,
      await this.shared.members(id, [productId]),
      false,
    );
    const result = await this.shared.history(
      id,
      productId,
      page,
      DEFAULT_PAGE_SIZE,
    );
    for (const row of result.items)
      for (const snapshot of [row.before, row.after])
        if (Array.isArray(snapshot))
          checkStockMembers(session, snapshot, false);
    return result;
  }
}
