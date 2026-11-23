import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import {
  checkEventRead,
  checkEventAccessWrite,
} from "@/shared/auth/check-cash-box-access";
import { checkAccess } from "@/shared/auth/check-access";
import { throwBusinessError } from "@/shared/errors/business-error";
import { parseInput } from "@/shared/validation/input";
import { validateDeliveryId } from "../inputs/delivery.input";
export async function deliveryEvent(
  events: EventRepository,
  session: Session | null,
  input: unknown,
  write = false,
) {
  checkAccess(session);
  const eventId = parseInput(validateDeliveryId(input));
  const event = await events.find(eventId);
  if (!event) return eventMissing();
  if (write) checkEventAccessWrite(session, event);
  else checkEventRead(session, event);
  if (!event.deliveryEnabled || event.kind === "product_category")
    throwBusinessError({
      code: "EVENT_DELIVERY_DISABLED",
      category: "conflict",
    });
  return event;
}
export const deliveryChanged = (): never =>
  throwBusinessError({ code: "DELIVERY_CHANGED", category: "conflict" });
export function operationMetadata(
  session: Session | null,
  requestId: string,
  fingerprint: string,
  version: number,
) {
  const actor = checkAccess(session).user;
  return {
    version: version + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.id,
    updatedByName: actor.name,
    lastOperation: requestId,
    fingerprint,
  };
}
