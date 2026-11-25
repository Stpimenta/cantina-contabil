import { checkAccess } from "@/shared/auth/check-access";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { canAlterEvent } from "@/shared/auth/access-policy";
import { parseInput } from "@/shared/validation/input";
import { validateEventId } from "@/server/events/inputs/event-query.input";
import { eventMissing } from "@/server/events/models/event-rules";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { Event } from "@/server/events/models/event.model";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import type { StockImportOption } from "../models/stock-import-option.model";
import { stockContext } from "../models/shared-stock.model";
export class LoadStockImportOptionsUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly shared: SharedStockRepository,
  ) {}
  async execute(
    session: Session | null,
    targetInput?: unknown,
  ): Promise<StockImportOption[]> {
    const access = checkAccess(session);
    const targetId =
      targetInput === undefined
        ? undefined
        : parseInput(validateEventId(targetInput));
    if (targetId) {
      const target = await this.events.find(targetId);
      if (!target) return eventMissing();
      checkEventAccessWrite(session, target);
    }
    const all = await this.shared.candidates("");
    const catalogs = new Map<string, Event | null>();
    const result: StockImportOption[] = [];
    for (const member of all) {
      const group = all.filter((m) => m.stockId === member.stockId);
      if (
        group.some((m) => m.eventId === targetId) ||
        !group.every((m) =>
          canAlterEvent(access, { id: m.eventId, cashBoxId: m.cashBoxId }),
        )
      )
        continue;
      if (!catalogs.has(member.eventId))
        catalogs.set(member.eventId, await this.events.find(member.eventId));
      const catalog = catalogs.get(member.eventId);
      const product = catalog?.products.find((p) => p.id === member.productId);
      if (
        !product ||
        catalog?.kind !== "product_category" ||
        catalog.version !== member.eventVersion
      )
        continue;
      result.push({
        sourceCategoryId: member.eventId,
        sourceProductId: member.productId,
        sourceStockId: member.stockId,
        categoryName: member.categoryName,
        product,
        context: stockContext(group),
        quantity: member.quantity,
      });
    }
    return result;
  }
}
