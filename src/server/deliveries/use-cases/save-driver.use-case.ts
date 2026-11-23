import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateDriver } from "../inputs/delivery.input";
import {
  deliveryEvent,
  deliveryChanged,
  operationMetadata,
} from "../models/delivery-rules";
export class SaveDriverUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventId: unknown, input: unknown) {
    await deliveryEvent(this.events, session, eventId, true);
    const data = parseInput(validateDriver(input));
    const fingerprint = JSON.stringify({ ...data, actor: session!.user.id });
    const current = (await this.repo.drivers()).find((d) => d.id === data.id);
    if (
      current?.lastOperation === data.requestId &&
      current.fingerprint === fingerprint
    )
      return current;
    if ((current?.version ?? 0) !== data.version) return deliveryChanged();
    const value = {
      id: data.id,
      name: data.name,
      phone: data.phone,
      ...operationMetadata(session, data.requestId, fingerprint, data.version),
    };
    if (!(await this.repo.saveDriver(value, data.version)))
      return deliveryChanged();
    return value;
  }
}
