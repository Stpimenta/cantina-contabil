import { prepareOrderStock } from "@/server/products/use-cases/prepare-order-stock";
import type { SharedStockRepository } from "@/server/products/repositories/shared-stock.repository";
import {
  checkEventRead,
  checkEventAccessWrite,
} from "@/shared/auth/check-cash-box-access";
import { checkCashBoxWrite } from "@/shared/auth/check-cash-box-access";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import {
  eventMissing,
  eventChanged,
  checkEventWrite,
} from "@/server/events/models/event-rules";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { CommandAuthorization } from "../repositories/canteen.repository";
import type { CommandIdentity } from "../models/command-actor.model";
import {
  validateCommandId,
  validateCollectCommand,
} from "../inputs/command.input";
export class CollectCommandUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly auth: CommandAuthorization,
    private readonly shared?: SharedStockRepository,
  ) {}
  async execute(
    identity: CommandIdentity,
    eventInput: unknown,
    orderInput: unknown,
    input: unknown,
  ) {
    const eventId = parseInput(validateCommandId(eventInput)),
      id = parseInput(validateCommandId(orderInput));
    const data = parseInput(validateCollectCommand(input));
    const actor = await this.auth.resolve(identity, eventId);
    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    if (identity.kind === "user")
      checkEventAccessWrite(identity.session, event);
    if (!event.canteenEnabled)
      throwBusinessError({ code: "CANTEEN_REQUIRED", category: "conflict" });
    const current = await this.events.findOrder(id);
    if (!current || current.eventId !== eventId) return eventMissing();
    const fingerprint = JSON.stringify({
      operation: "collect",
      eventId,
      id,
      ...data,
      actor: actor.kind === "access" ? actor.id : actor.id,
      kind: actor.kind,
    });
    if (
      current.lastOperation === data.requestId &&
      current.fingerprint === fingerprint
    )
      return { id, version: current.version };
    if (current.version !== data.version) return eventChanged();
    const order = {
      ...current,
      stockContext: null as string | null,
      collected: data.collected,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.kind === "user" ? actor.id : 0,
      updatedByName:
        actor.kind === "user"
          ? actor.name
          : `${actor.name} — acesso criado por ${actor.createdByName}`,
      updatedActor: actor,
      lastOperation: data.requestId,
      fingerprint,
    };
    const stock = await prepareOrderStock(
      identity.kind === "user" ? identity.session : null,
      this.shared,
      this.events,
      event,
      current,
      order,
      data.stockConfirmation,
      identity.kind !== "user",
    );
    order.stockContext = stock.context;
    const result = await this.events.updateOrder(
      order,
      current.version,
      event.version,
      stock.additions,
    );
    if (result === "stale") {
      const saved = await this.events.findOrder(id);
      if (
        saved?.lastOperation === data.requestId &&
        saved.fingerprint === fingerprint
      )
        return { id, version: saved.version };
    }
    checkEventWrite(result);
    return { id, version: order.version };
  }
}
