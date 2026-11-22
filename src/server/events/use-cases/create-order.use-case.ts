import { receiptMetadata } from "@/shared/receipts/receipt-input";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import {
  keepOrderReceipts,
  inspectOrderReceipts,
  storeOrderReceipts,
} from "./order-receipts";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateSaveOrder } from "../inputs/save-order.input";
import { validateEventId } from "../inputs/event-query.input";
import {
  orderFields,
  checkRepeat,
  checkEventWrite,
  eventChanged,
  eventMissing,
} from "../models/event-rules";
import type { EventOrder } from "../models/event-order.model";
export class CreateOrderUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly receipts?: ReceiptRepository,
  ) {}
  async execute(
    session: Session | null,
    eventIdInput: unknown,
    rawInput: unknown,
    files: File[] = [],
  ) {
    const input =
      typeof rawInput === "object" && rawInput !== null
        ? { ...rawInput, receipts: files.map(receiptMetadata) }
        : rawInput;
    const access = checkAccess(session);
    const eventId = parseInput(validateEventId(eventIdInput));
    const data = parseInput(validateSaveOrder(input));
    const id = data.requestId;

    const authorizedEvent = await this.events.find(eventId);
    if (!authorizedEvent) return eventMissing();
    checkEventAccessWrite(session, authorizedEvent);
    parseInput(
      validateSaveOrder(
        input,
        authorizedEvent.deliveryEnabled,
        authorizedEvent.kind === "product_category",
      ),
    );
    const current = await this.events.findOrder(id);
    const hashes = await inspectOrderReceipts(files);
    const fingerprint = JSON.stringify({
      eventId,
      ...data,
      ...(files.length ? { hashes } : {}),
    });
    if (current && current.eventId !== eventId) return eventMissing();
    if (checkRepeat(current, data.requestId, fingerprint, access.user.id))
      return current!;
    if (current)
      throwBusinessError({
        code: "EVENT_REQUEST_CONFLICT",
        category: "conflict",
      });

    const event = authorizedEvent;
    if (event.version !== data.catalogVersion) return eventChanged();
    const fields = orderFields(data, event, current ?? undefined);
    const kept = keepOrderReceipts([], data.retainedReceiptIds, files.length);
    const stored = await storeOrderReceipts(
      this.receipts,
      eventId,
      id,
      data.requestId,
      files,
      hashes,
    );
    const now = new Date().toISOString();
    const order: EventOrder = {
      ...fields,
      receipts: [...kept, ...stored],
      id,
      eventId,
      version: 1,
      createdAt: now,
      createdBy: access.user.id,
      createdByName: access.user.name,
      updatedAt: now,
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      lastOperation: data.requestId,
      fingerprint,
    };
    const outcome = await this.events.createOrder(order, event.version);
    if (outcome === "stale") {
      const saved = await this.events.findOrder(id);
      if (checkRepeat(saved, data.requestId, fingerprint, access.user.id))
        return saved!;
    }
    checkEventWrite(outcome);
    return order;
  }
}
