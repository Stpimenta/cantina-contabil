import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import type { CredentialCodec } from "@/server/canteen/repositories/canteen.repository";
import { parseInput } from "@/shared/validation/input";
import { validateDeliveryAccess } from "../inputs/delivery.input";
import { deliveryEvent, deliveryChanged } from "../models/delivery-rules";
export class CreateDeliveryAccessUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
    private readonly codec: CredentialCodec,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput, true),
      data = parseInput(validateDeliveryAccess(input));
    if (
      !(await this.repo.settings(event.id))?.driverIds.includes(data.driverId)
    )
      return deliveryChanged();
    const secret = this.codec.random();
    const access = {
      id: data.requestId,
      eventId: event.id,
      driverId: data.driverId,
      name: data.name,
      createdBy: session!.user.id,
      createdByName: session!.user.name,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      revokedAt: null,
      activatedAt: null,
    };
    if (!(await this.repo.createAccess(access, await this.codec.hash(secret))))
      return deliveryChanged();
    return { access, secret };
  }
}
