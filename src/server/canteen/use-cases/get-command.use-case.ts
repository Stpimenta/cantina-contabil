import {
  checkEventRead,
  checkEventAccessWrite,
} from "@/shared/auth/check-cash-box-access";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { CommandAuthorization } from "../repositories/canteen.repository";
import type { CommandIdentity } from "../models/command-actor.model";
import type { Command } from "../models/command.model";
import { validateCommandId } from "../inputs/command.input";
export class GetCommandUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly auth: CommandAuthorization,
  ) {}
  async execute(
    identity: CommandIdentity,
    eventInput: unknown,
    orderInput: unknown,
  ): Promise<Command | null> {
    const eventId = parseInput(validateCommandId(eventInput)),
      id = parseInput(validateCommandId(orderInput));
    await this.auth.resolve(identity, eventId);
    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    if (identity.kind === "user") checkEventRead(identity.session, event);
    if (!event.canteenEnabled)
      throwBusinessError({ code: "CANTEEN_REQUIRED", category: "conflict" });
    const order = await this.events.findOrder(id);
    if (!order || order.eventId !== eventId) return null;
    return {
      id: order.id,
      version: order.version,
      customerName: order.customerName,
      note: order.note,
      createdAt: order.createdAt,
      collected: order.collected ?? false,
      paid: order.paid,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        icon: i.icon,
      })),
    };
  }
}
