import { checkAccess } from "@/shared/auth/check-access";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import { canAlterEvent } from "@/shared/auth/access-policy";
import { parseInput } from "@/shared/validation/input";
import { validateEventId } from "@/server/events/inputs/event-query.input";
import { eventMissing } from "@/server/events/models/event-rules";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { checkStockMembers } from "./shared-stock-access";
export class LoadSharedStockUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly shared: SharedStockRepository,
  ) {}
  async execute(
    session: Session | null,
    categoryInput: unknown,
    productInput: unknown,
  ) {
    const access = checkAccess(session);
    const id = parseInput(validateEventId(categoryInput)),
      productId = parseInput(validateEventId(productInput));
    const event = await this.events.find(id);
    if (
      !event ||
      event.kind !== "product_category" ||
      !event.products.some((p) => p.id === productId)
    )
      return eventMissing();
    checkEventRead(session, event);
    const members = await this.shared.members(id, [productId]);
    checkStockMembers(session, members, false);
    const canWrite = (rows: typeof members) =>
      rows.every((m) =>
        canAlterEvent(access, {
          id: m.eventId,
          cashBoxId: m.cashBoxId,
          kind: "product_category",
        }),
      );
    const writable = canWrite(members);
    return { members, writable };
  }
}
