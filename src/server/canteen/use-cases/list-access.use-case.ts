import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { validateCommandId } from "../inputs/command.input";
import type { CanteenRepository } from "../repositories/canteen.repository";
export class ListAccessUseCase {
  constructor(
    private readonly repo: CanteenRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventId: unknown) {
    checkAccess(session);
    const id = parseInput(validateCommandId(eventId));
    const event = await this.events.find(id);
    if (!event) return eventMissing();
    checkEventAccessWrite(session, event);
    return this.repo.listAccess(id);
  }
}
