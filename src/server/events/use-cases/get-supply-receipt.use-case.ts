import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventRepository } from "../repositories/event.repository";
import type { EventSupplyRepository } from "../repositories/event-supply.repository";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import { validateEventId } from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
export class GetSupplyReceiptUseCase {
  constructor(
    private readonly supplies: EventSupplyRepository,
    private readonly events: EventRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(
    session: Session | null,
    rawEventId: unknown,
    rawId: unknown,
    rawReceiptId: unknown = null,
  ) {
    checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const id = parseInput(validateEventId(rawId));
    const receiptId =
      rawReceiptId === null ? null : parseInput(validateEventId(rawReceiptId));
    if (!(await this.events.find(eventId))) return eventMissing();
    const supply = await this.supplies.find(id);
    const attachment =
      supply?.eventId === eventId
        ? receiptId
          ? supply.receipts.find((value) => value.id === receiptId)
          : supply.receipts[0]
        : null;
    if (!attachment)
      throwBusinessError({ code: "RECEIPT_NOT_FOUND", category: "not_found" });
    const receipt = await this.receipts.get(attachment.key);
    if (!receipt)
      throwBusinessError({ code: "RECEIPT_NOT_FOUND", category: "not_found" });
    return { body: receipt.body, type: attachment.type };
  }
}
