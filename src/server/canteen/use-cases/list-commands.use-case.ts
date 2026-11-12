import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type {
  CanteenRepository,
  CommandAuthorization,
} from "../repositories/canteen.repository";
import type { CommandIdentity } from "../models/command-actor.model";
import {
  validateCommandId,
  validateCommandQuery,
} from "../inputs/command.input";
export class ListCommandsUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly repo: CanteenRepository,
    private readonly auth: CommandAuthorization,
  ) {}
  async execute(
    identity: CommandIdentity,
    eventInput: unknown,
    input: unknown,
  ) {
    const id = parseInput(validateCommandId(eventInput));
    await this.auth.resolve(identity, id);
    const q = parseInput(validateCommandQuery(input));
    const event = await this.events.find(id);
    if (!event) return eventMissing();
    if (!event.canteenEnabled)
      throwBusinessError({ code: "CANTEEN_REQUIRED", category: "conflict" });
    const result = await this.repo.commands(
      id,
      q.q,
      q.page,
      q.collected === "collected",
    );
    return { ...result, eventName: event.name };
  }
}
