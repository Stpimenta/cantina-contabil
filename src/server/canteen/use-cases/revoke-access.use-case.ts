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
    await this.publications.arm(eventId, operation);
    await this.repo.revoke(id, eventId, operation);
  }
}
