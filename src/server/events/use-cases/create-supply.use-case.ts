import { inspectSupplyReceipts, storeSupplyReceipts } from "./supply-receipts";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import type { EventRepository } from "../repositories/event.repository";
import type { EventSupplyRepository } from "../repositories/event-supply.repository";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import type { EventSupply } from "../models/event-supply.model";
import {
  validateCreateSupply,
  receiptMetadata,
} from "../inputs/create-supply.input";
import { validateEventId } from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";

export class CreateSupplyUseCase {
  constructor(
    private readonly supplies: EventSupplyRepository,
    private readonly events: EventRepository,
    private readonly boxes: CashBoxRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(
    session: Session | null,
    rawEventId: unknown,
    rawInput: unknown,
    files: File[],
  ) {
    const access = checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const input =
      typeof rawInput === "object" && rawInput !== null
        ? { ...rawInput, receipts: files.map(receiptMetadata) }
        : rawInput;
    const data = parseInput(validateCreateSupply(input));
    const hashes = await inspectSupplyReceipts(files);
    const fingerprint = JSON.stringify({ eventId, ...data, hashes });
    const same = (current: EventSupply) =>
      current.fingerprint === fingerprint &&
      current.createdBy === access.user.id;
    const conflict = () =>
      throwBusinessError({
        code: "SUPPLY_REQUEST_CONFLICT",
        category: "conflict",
      });
    if (!(await this.events.find(eventId))) return eventMissing();
    const existing = await this.supplies.find(data.requestId);
    if (existing) return same(existing) ? existing : conflict();
    const box =
      data.source === "purchase" && data.cashBoxId
        ? await this.boxes.find(data.cashBoxId)
        : null;
    if (data.source === "purchase") {
      if (!box)
        throwBusinessError({
          code: "CASH_BOX_UNAVAILABLE",
          category: "conflict",
        });
      if (box.balanceCents < data.amount)
        throwBusinessError({
          code: "SUPPLY_INSUFFICIENT_BALANCE",
          category: "conflict",
        });
    }
    const receipts = await storeSupplyReceipts(
      this.receipts,
      eventId,
      data.requestId,
      files,
      hashes,
    );
    const now = new Date().toISOString();
    const value: EventSupply = {
      id: data.requestId,
      eventId,
      name: data.name,
      description: data.description,
      donorName: data.source === "donation" ? data.donorName : "",
      icon: data.icon,
      amountCents: data.amount,
      source: data.source,
      cashBoxId: box?.id ?? null,
      cashBoxName: box?.name ?? null,
      received: data.received,
      receipts,
      receiptKey: receipts[0]?.key ?? null,
      receiptType: receipts[0]?.type ?? null,
      version: 1,
      createdAt: now,
      createdBy: access.user.id,
      createdByName: access.user.name,
      updatedAt: now,
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      fingerprint,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
    };
    const outcome = await this.supplies.create(value);
    if (outcome !== "saved") {
      // A concurrent repeat can reach a BEFORE INSERT guard after the first
      // request already committed. Return that same record, never debit twice.
      const saved = await this.supplies.find(value.id);
      if (saved) return same(saved) ? saved : conflict();
      if (outcome === "exists") return conflict();
    }
    if (outcome === "insufficient")
      throwBusinessError({
        code: "SUPPLY_INSUFFICIENT_BALANCE",
        category: "conflict",
      });
    if (outcome === "box_unavailable")
      throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    if (outcome === "event_unavailable") return eventMissing();
    if (outcome === "limit")
      throwBusinessError({ code: "AMOUNT_LIMIT", category: "validation" });
    return value;
  }
}
