import { credentialSchema } from "@/server/canteen/inputs/command.input";
import type { CredentialCodec } from "@/server/canteen/repositories/canteen.repository";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import type { DeliveryActor } from "../models/delivery-actor.model";
import { throwBusinessError } from "@/shared/errors/business-error";
export class ResolveDeliveryAccessUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
    private readonly codec: CredentialCodec,
  ) {}
  async execute(credential: unknown, eventId: string): Promise<DeliveryActor> {
    const ended = (): never =>
      throwBusinessError({
        code: "TEMP_ACCESS_ENDED",
        category: "unauthenticated",
      });
    if (!credentialSchema.safeParse(credential).success) return ended();
    const access = await this.repo.accessByCredential(
      await this.codec.hash(credential as string),
    );
    if (
      !access ||
      access.eventId !== eventId ||
      access.revokedAt !== null ||
      access.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return ended();
    const event = await this.events.find(eventId),
      settings = await this.repo.settings(eventId);
    if (
      !event?.deliveryEnabled ||
      !settings?.driverIds.includes(access.driverId)
    )
      return ended();
    return {
      kind: "delivery",
      id: access.id,
      name: access.name,
      eventId,
      driverId: access.driverId,
      createdBy: access.createdBy,
      createdByName: access.createdByName,
      expiresAt: access.expiresAt,
    };
  }
}
