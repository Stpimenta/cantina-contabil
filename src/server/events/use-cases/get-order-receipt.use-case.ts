import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventRepository } from "../repositories/event.repository";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import { validateEventId } from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
import { orderReceiptKey } from "./order-receipts";
export class GetOrderReceiptUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(
    session: Session | null,
    rawEventId: unknown,
    rawOrderId: unknown,
    rawReceiptId: unknown,
  ) {
    checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const orderId = parseInput(validateEventId(rawOrderId));
    const receiptId = parseInput(validateEventId(rawReceiptId));
    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    checkEventRead(session, event);
    const order = await this.events.findOrder(orderId);
    const attachment =
      order?.eventId === eventId
        ? order.receipts?.find((receipt) => receipt.id === receiptId)
        : undefined;
    if (!attachment)
      throwBusinessError({ code: "RECEIPT_NOT_FOUND", category: "not_found" });
    const receipt = await this.receipts.get(
      orderReceiptKey(eventId, orderId, receiptId),
    );
    if (!receipt)
      throwBusinessError({ code: "RECEIPT_NOT_FOUND", category: "not_found" });
    return { body: receipt.body, type: attachment.type };
  }
}
