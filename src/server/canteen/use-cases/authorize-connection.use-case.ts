import type { CommandAuthorization } from "../repositories/canteen.repository";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { CommandIdentity } from "../models/command-actor.model";
import { parseInput } from "@/shared/validation/input";
import { validateCommandId } from "../inputs/command.input";
import { throwBusinessError } from "@/shared/errors/business-error";
export class AuthorizeConnectionUseCase {
  constructor(
    private readonly auth: CommandAuthorization,
    private readonly events: EventRepository,
  ) {}
  async execute(identity: CommandIdentity, eventInput: unknown) {
    const id = parseInput(validateCommandId(eventInput)),
      actor = await this.auth.resolve(identity, id),
      e = await this.events.find(id);
    if (!e?.canteenEnabled)
      throwBusinessError({ code: "CANTEEN_REQUIRED", category: "forbidden" });
    return actor;
  }
}
