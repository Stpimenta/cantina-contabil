import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import {
  validateEventId,
  validateOrderQuery,
} from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class ListOrdersUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, idInput: unknown, input: unknown) {
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const data = parseInput(validateOrderQuery(input));
    const event = await this.events.find(id);
    if (!event) return eventMissing();
    checkEventRead(session, event);
    const today = currentDateInSaoPaulo();
    const end = new Date(`${today}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + (data.period === "week" ? (7 - end.getUTCDay()) % 7 : 30));
    const range = data.period === "all" ? undefined : { from: today, to: end.toISOString().slice(0, 10) };
    return this.events.listOrders(
      id,
      data.query,
      data.page,
      DEFAULT_PAGE_SIZE,
      data.status,
      data.fulfillment,
      { range, withdrawals: event.kind === "product_category" || (!event.deliveryEnabled && !event.canteenEnabled) },
    );
  }
}
