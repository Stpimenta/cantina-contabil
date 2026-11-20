import type { Harness } from "./harness";
import type { Event } from "@/server/events/models/event.model";
import { D1ProductStockRepository } from "@/server/products/infrastructure/d1-product-stock.repository";
import { SaveStockEntryUseCase } from "@/server/products/use-cases/save-stock-entry.use-case";
import { DeleteStockEntryUseCase } from "@/server/products/use-cases/delete-stock-entry.use-case";
import { uuid } from "./data";

// Explicit physical stock for tests whose subject is finance/delivery, not shortages.
export async function replenishEvent(
  h: Harness,
  event: Event,
  quantity = 1000,
) {
  const save = new SaveStockEntryUseCase(
    h.events,
    new D1ProductStockRepository(h.db),
  );
  for (const product of event.products) {
    const id = uuid();
    await save.execute(h.actor, {
      categoryId: event.id,
      productId: product.id,
      entryId: id,
      requestId: id,
      expectedVersion: 0,
      quantity,
    });
  }
}
export async function clearEventEntries(h: Harness, event: Event) {
  const stock = new D1ProductStockRepository(h.db);
  const remove = new DeleteStockEntryUseCase(h.events, stock);
  for (const product of event.products) {
    const entries = await stock.entries(event.id, product.id, 1, 15);
    for (const entry of entries.items) {
      await remove.execute(h.actor, {
        categoryId: event.id,
        productId: product.id,
        entryId: entry.id,
        requestId: uuid(),
        expectedVersion: entry.version,
      });
    }
  }
}
