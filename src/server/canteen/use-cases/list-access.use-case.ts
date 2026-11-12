import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { validateCommandId } from "../inputs/command.input";
import type { CanteenRepository } from "../repositories/canteen.repository";
export class ListAccessUseCase {
  constructor(private readonly repo: CanteenRepository) {}
  async execute(session: Session | null, eventId: unknown) {
    checkAccess(session);
    return this.repo.listAccess(parseInput(validateCommandId(eventId)));
  }
}
