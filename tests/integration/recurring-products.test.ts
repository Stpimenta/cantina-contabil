import { afterEach, beforeEach, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, uuid } from "../support/data";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { DeleteEventUseCase } from "@/server/events/use-cases/delete-event.use-case";
import { D1ProductStockRepository } from "@/server/products/infrastructure/d1-product-stock.repository";
import { SaveStockEntryUseCase } from "@/server/products/use-cases/save-stock-entry.use-case";
import { DeleteStockEntryUseCase } from "@/server/products/use-cases/delete-stock-entry.use-case";
import { LoadStockEntriesUseCase } from "@/server/products/use-cases/load-stock-entries.use-case";
import { ListProductCategoriesUseCase } from "@/server/products/use-cases/list-product-categories.use-case";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
it("operador consulta somente o grupo concedido e precisa de Alteração para estoque", async () => {
  const box = await h.box();
  const create = new CreateEventUseCase(h.events, h.boxes);
  const input = {
    ...eventInput(box.id),
    kind: "product_category",
    occursOn: "",
  };
  const own = await create.execute(h.actor, input);
  await create.execute(h.actor, {
    ...input,
    requestId: uuid(),
    name: "Outro grupo",
  });
  const stock = new D1ProductStockRepository(h.db);
  const reader = {
    ...h.actor,
    role: "operator" as const,
    eventIds: [own.id],
    eventWriteIds: [],
  };
  expect(
    (
      await new ListProductCategoriesUseCase(h.events).execute(reader, {})
    ).items.map((x) => x.id),
  ).toEqual([own.id]);
  const save = new SaveStockEntryUseCase(h.events, stock);
  const requestId = uuid();
  const entryInput = {
    requestId,
    entryId: requestId,
    categoryId: own.id,
    productId: own.products[0].id,
    expectedVersion: 0,
    quantity: 10,
  };
  await expect(save.execute(reader, entryInput)).rejects.toMatchObject({
    details: { code: "ACCESS_DENIED" },
  });
  const writer = { ...reader, eventWriteIds: [own.id] };
  const entry = await save.execute(writer, entryInput);
  expect(
    (
      await new LoadStockEntriesUseCase(h.events, stock).execute(
        reader,
        own.id,
        own.products[0].id,
        null,
      )
    ).items,
  ).toHaveLength(1);
  await expect(
    new DeleteEventUseCase(h.events).execute(writer, own.id, 1),
  ).rejects.toMatchObject({ details: { code: "STOCK_HAS_ENTRIES" } });
  await new DeleteStockEntryUseCase(h.events, stock).execute(writer, {
    ...entryInput,
    requestId: uuid(),
    expectedVersion: entry.version,
  });
  expect(await stock.productInUse(own.id, own.products[0].id)).toBe(false);
  await new DeleteEventUseCase(h.events).execute(writer, own.id, 1);
  expect(await h.events.find(own.id)).toBeNull();
});
it("cursor não pula entradas após exclusão e correções concorrentes revertem o conjunto", async () => {
  const box = await h.box();
  const group = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    {
      ...eventInput(box.id),
      kind: "product_category",
      occursOn: "",
    },
  );
  const stock = new D1ProductStockRepository(h.db);
  const save = new SaveStockEntryUseCase(h.events, stock);
  const created = [];
  for (let i = 0; i < 16; i++) {
    const requestId = uuid();
    created.push(
      await save.execute(h.actor, {
        requestId,
        entryId: requestId,
        categoryId: group.id,
        productId: group.products[0].id,
        expectedVersion: 0,
        quantity: 2,
      }),
    );
  }
  const load = new LoadStockEntriesUseCase(h.events, stock);
  const first = await load.execute(
    h.actor,
    group.id,
    group.products[0].id,
    null,
  );
  expect(first.items).toHaveLength(15);
  expect(first.hasMore).toBe(true);
  await new DeleteStockEntryUseCase(h.events, stock).execute(h.actor, {
    requestId: uuid(),
    categoryId: group.id,
    productId: group.products[0].id,
    entryId: first.items[0].id,
    expectedVersion: 1,
  });
  const next = await load.execute(
    h.actor,
    group.id,
    group.products[0].id,
    first.cursor,
  );
  expect(next.items).toHaveLength(1);
  expect(next.hasMore).toBe(false);
  expect(first.items.some((entry) => entry.id === next.items[0].id)).toBe(
    false,
  );
  const [a, b] = first.items.slice(1, 3);
  await save.execute(h.actor, {
    requestId: uuid(),
    entryId: b.id,
    categoryId: group.id,
    productId: group.products[0].id,
    expectedVersion: 1,
    quantity: 3,
  });
  await expect(
    stock.saveEntries([
      {
        ...a,
        quantity: 5,
        version: 2,
        updatedAt: new Date().toISOString(),
        lastOperation: uuid(),
      },
      {
        ...b,
        quantity: 5,
        version: 2,
        updatedAt: new Date().toISOString(),
        lastOperation: uuid(),
      },
    ]),
  ).rejects.toMatchObject({ details: { code: "STOCK_CHANGED" } });
  expect((await stock.findEntry(a.id))?.quantity).toBe(2);
  expect((await stock.findEntry(b.id))?.quantity).toBe(3);
});
