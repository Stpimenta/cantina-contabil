import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import type {
  CanteenRepository,
  CredentialCodec,
} from "../repositories/canteen.repository";
import {
  validateCommandId,
  validateTemporaryAccess,
} from "../inputs/command.input";
export class CreateAccessUseCase {
  constructor(
    private readonly repo: CanteenRepository,
    private readonly events: EventRepository,
    private readonly codec: CredentialCodec,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const actor = checkAccess(session).user,
      id = parseInput(validateCommandId(eventInput)),
      data = parseInput(validateTemporaryAccess(input));
    const e = await this.events.find(id);
    if (!e) return eventMissing();
    checkEventAccessWrite(session, e);
    if (!e.canteenEnabled)
      throwBusinessError({ code: "CANTEEN_REQUIRED", category: "conflict" });
    const secret = this.codec.random();
    const access = {
      id: data.requestId,
      eventId: id,
      name: data.name,
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      revokedAt: null,
      activatedAt: null,
    };
    if (!(await this.repo.createAccess(access, await this.codec.hash(secret))))
      throwBusinessError({
        code: "EVENT_REQUEST_CONFLICT",
        category: "conflict",
      });
    return { access, secret };
  }
}
