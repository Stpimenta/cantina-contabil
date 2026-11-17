import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { validateCommandId } from "../inputs/command.input";
import type {
  CanteenRepository,
  PublicationCoordinator,
} from "../repositories/canteen.repository";
export class RevokeAccessUseCase {
  constructor(
    private readonly repo: CanteenRepository,
    private readonly publications: PublicationCoordinator,
    private readonly events: EventRepository,
  ) {}
  async execute(
    session: Session | null,
    eventInput: unknown,
    idInput: unknown,
    operationInput: unknown,
  ) {
    checkAccess(session);
    const eventId = parseInput(validateCommandId(eventInput)),
      id = parseInput(validateCommandId(idInput)),
      operation = parseInput(validateCommandId(operationInput));
    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    checkEventAccessWrite(session, event);
    await this.publications.arm(eventId, operation);
    await this.repo.revoke(id, eventId, operation);
  }
}
