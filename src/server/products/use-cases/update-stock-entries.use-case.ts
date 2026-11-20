import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import type { StockEntry } from "../models/stock-entry.model";
import { checkAccess } from "@/shared/auth/check-access";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { checkRepeat, eventMissing } from "@/server/events/models/event-rules";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateUpdateStockEntries } from "../inputs/stock.input";
export class UpdateStockEntriesUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateUpdateStockEntries(input));
    const category = await this.events.find(data.categoryId);
    if (!category || !category.products.some((p) => p.id === data.productId))
      return eventMissing();
    const actor = checkEventAccessWrite(session, category).user;
    const fingerprint = JSON.stringify({
      operation: "updateStockEntries",
      ...data,
    });
    const current: StockEntry[] = [];
    for (const change of data.entries) {
      const entry = await this.stock.findEntry(change.entryId);
      if (
        !entry ||
        entry.eventId !== category.id ||
        entry.productId !== data.productId
      )
        return eventMissing();
      current.push(entry);
    }
    const repeated = current.map((entry) =>
      checkRepeat(entry, data.requestId, fingerprint, actor.id),
    );
    const existingAddition = data.addition
      ? await this.stock.findEntry(data.addition.entryId)
      : null;
    if (
      existingAddition &&
      (existingAddition.eventId !== category.id ||
        existingAddition.productId !== data.productId)
    )
      return eventMissing();
    const additionRepeated =
      !data.addition ||
      checkRepeat(existingAddition, data.requestId, fingerprint, actor.id);
    if (repeated.every(Boolean) && additionRepeated)
      return { categoryId: category.id };
    if (
      repeated.some(Boolean) ||
      existingAddition ||
      current.some(
        (entry, i) =>
          entry.deletedAt || entry.version !== data.entries[i].expectedVersion,
      )
    )
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    const balances = await this.stock.balances(category.id);
    const delta = data.entries.reduce(
      (sum, change, i) =>
        sum + BigInt(change.quantity) - BigInt(current[i].quantity),
      0n,
    );
    const next =
      BigInt(
        balances.find((b) => b.productId === data.productId)?.quantity ?? 0,
      ) +
      delta +
      BigInt(data.addition?.quantity ?? 0);
    if (next < 0n)
      throwBusinessError({
        code: "STOCK_ENTRY_REDUCTION_BLOCKED",
        category: "conflict",
      });
    if (next > BigInt(Number.MAX_SAFE_INTEGER))
      throwBusinessError({ code: "STOCK_LIMIT", category: "conflict" });
    const now = new Date().toISOString();
    const updates = current.map((entry, i) => ({
      ...entry,
      quantity: data.entries[i].quantity,
      version: entry.version + 1,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
      lastOperation: data.requestId,
      fingerprint,
    }));
    // Credit increases before reductions so an otherwise valid correction cannot
    // temporarily consume stock released by another change in the same batch.
    updates.sort((a, b) => {
      const gainA =
        BigInt(a.quantity) -
        BigInt(current.find((e) => e.id === a.id)!.quantity);
      const gainB =
        BigInt(b.quantity) -
        BigInt(current.find((e) => e.id === b.id)!.quantity);
      return gainA === gainB
        ? a.id.localeCompare(b.id)
        : gainA > gainB
          ? -1
          : 1;
    });
    const addition: StockEntry | undefined = data.addition
      ? {
          id: data.addition.entryId,
          eventId: category.id,
          productId: data.productId,
          quantity: data.addition.quantity,
          version: 1,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
          createdAt: now,
          createdBy: actor.id,
          createdByName: actor.name,
          updatedAt: now,
          updatedBy: actor.id,
          updatedByName: actor.name,
          lastOperation: data.requestId,
          fingerprint,
        }
      : undefined;
    await this.stock.saveEntries(updates, addition);
    return { categoryId: category.id };
  }
}
