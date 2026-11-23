import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateSettings } from "../inputs/delivery.input";
import {
  deliveryEvent,
  deliveryChanged,
  operationMetadata,
} from "../models/delivery-rules";
export class SaveDeliverySettingsUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput, true),
      data = parseInput(validateSettings(input));
    const fingerprint = JSON.stringify({ ...data, actor: session!.user.id });
    const current = await this.repo.settings(event.id);
    if (
      current?.lastOperation === data.requestId &&
      current.fingerprint === fingerprint
    )
      return current;
    if ((current?.version ?? 0) !== data.version) return deliveryChanged();
    const drivers = await this.repo.drivers();
    if (data.driverIds.some((id) => !drivers.some((d) => d.id === id)))
      return deliveryChanged();
    const value = {
      eventId: event.id,
      origin: data.origin!,
      driverIds: data.driverIds,
      ...operationMetadata(session, data.requestId, fingerprint, data.version),
    };
    if (!(await this.repo.saveSettings(value, data.version)))
      return deliveryChanged();
    return value;
  }
}
