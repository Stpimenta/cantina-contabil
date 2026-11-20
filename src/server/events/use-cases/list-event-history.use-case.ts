import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import {
  validateEventId,
  validateEventQuery,
} from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class ListEventHistoryUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, idInput: unknown, input: unknown) {
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const data = parseInput(validateEventQuery(input));
    const event = await this.events.find(id);
    if (!event) return eventMissing();
    checkEventRead(session, event);
    const history = await this.events.history(id, data.page, DEFAULT_PAGE_SIZE);
    const sold = await this.events.soldProducts(id);
    const catalogIds = new Set(event.products.map((product) => product.id));
    const soldProducts = [
      ...event.products.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: sold.find((item) => item.id === product.id)?.quantity ?? 0,
      })),
      ...sold.filter((product) => !catalogIds.has(product.id)),
    ];
    return { ...history, soldProducts };
  }
}
