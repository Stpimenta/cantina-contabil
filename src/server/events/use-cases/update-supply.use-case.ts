import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import type { EventRepository } from "../repositories/event.repository";
import type { EventSupplyRepository } from "../repositories/event-supply.repository";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import {
  validateUpdateSupply,
  validateSupplyUpdateFields,
  receiptMetadata,
} from "../inputs/create-supply.input";
import { inspectSupplyReceipts, storeSupplyReceipts } from "./supply-receipts";
import { validateEventId } from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
export class UpdateSupplyUseCase {
  constructor(
    private readonly supplies: EventSupplyRepository,
    private readonly events: EventRepository,
    private readonly boxes: CashBoxRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(
    session: Session | null,
    rawEventId: unknown,
    rawId: unknown,
    rawInput: unknown,
    files: File[],
  ) {
    const access = checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const id = parseInput(validateEventId(rawId));
    const fields = parseInput(validateSupplyUpdateFields(rawInput));
    if (!(await this.events.find(eventId))) return eventMissing();
    const current = await this.supplies.find(id);
    if (!current || current.deletedAt || current.eventId !== eventId)
      throwBusinessError({ code: "SUPPLY_NOT_FOUND", category: "not_found" });
    const raw = rawInput as Record<string, unknown>;
    const retained = fields.retainedReceiptIds.map((receiptId) =>
      current.receipts.find((receipt) => receipt.id === receiptId),
    );
    if (retained.some((receipt) => !receipt))
      throwBusinessError({ code: "SUPPLY_CHANGED", category: "conflict" });
    const kept = retained.filter((receipt) => receipt !== undefined);
    const data = parseInput(
      validateUpdateSupply({
        ...raw,
        requestId: id,
        receipts: [
          ...kept.map(({ size, type }) => ({ size, type })),
          ...files.map(receiptMetadata),
        ],
      }),
    );
    if (current.version !== data.version)
      throwBusinessError({ code: "SUPPLY_CHANGED", category: "conflict" });
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
      const credit =
        current.source === "purchase" && current.cashBoxId === box.id
          ? current.amountCents
          : 0;
      if (box.balanceCents + credit < data.amount)
        throwBusinessError({
          code: "SUPPLY_INSUFFICIENT_BALANCE",
          category: "conflict",
        });
    }
    const hashes = await inspectSupplyReceipts(files);
    const added = await storeSupplyReceipts(
      this.receipts,
      eventId,
      id,
      files,
      hashes,
    );
    const receipts = [...kept, ...added];
    const value = {
      ...current,
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
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: access.user.id,
      updatedByName: access.user.name,
    };
    const result = await this.supplies.update(value, current.version);
    if (result === "changed")
      throwBusinessError({ code: "SUPPLY_CHANGED", category: "conflict" });
    if (result === "insufficient")
      throwBusinessError({
        code: "SUPPLY_INSUFFICIENT_BALANCE",
        category: "conflict",
      });
    if (result === "box_unavailable")
      throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    if (result === "event_unavailable") return eventMissing();
    if (result === "limit")
      throwBusinessError({
        code: "AMOUNT_LIMIT",
        category: "validation",
        issues: { amount: "AMOUNT_LIMIT" },
      });
    return { id, eventId };
  }
}
