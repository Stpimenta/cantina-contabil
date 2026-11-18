import type { Session } from "@/server/auth/models/session.model";
import { eventReadScope } from "@/shared/auth/check-cash-box-access";
import { parseInput } from "@/shared/validation/input";
import { validateEventQuery } from "@/server/events/inputs/event-query.input";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class ListProductCategoriesUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, input: unknown) {
    const scope = eventReadScope(session);
    const data = parseInput(validateEventQuery(input));
    return this.events.list(data.query, data.page, DEFAULT_PAGE_SIZE, {
      ...scope,
      kind: "product_category",
    });
  }
}
