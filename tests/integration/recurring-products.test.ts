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
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderStatusUseCase } from "@/server/events/use-cases/update-order-status.use-case";
import { SaveOrderWithdrawalUseCase } from "@/server/products/use-cases/save-order-withdrawal.use-case";
import { ResolveOrderStockShortageUseCase } from "@/server/products/use-cases/resolve-order-stock-shortage.use-case";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
it("confirma uma falta por vez com autoria, sem duplicar entrada nem retirar o pedido", async () => {
  const box = await h.box();
  const group = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    {
      ...eventInput(box.id),
      kind: "product_category",
      occursOn: "",
      products: [
        { id: uuid(), name: "Brigadeiro", icon: "bag", price: "10" },
        { id: uuid(), name: "Bolo", icon: "bag", price: "10" },
      ],
    },
  );
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    group.id,
    {
      requestId: uuid(),
      catalogVersion: group.version,
      customerName: "Pessoa sintética",
      pickupOn: "2026-11-22",
      note: "",
      items: group.products.map((p) => ({ productId: p.id, quantity: 4 })),
      total: "80",
      paid: false,
      cash: "0",
      pix: "0",
    },
  );
  const before = await h.events.findOrder(order.id);
  expect(before).not.toBeNull();
  const stock = new D1ProductStockRepository(h.db);
  const resolve = new ResolveOrderStockShortageUseCase(
    h.events,
    stock,
    new SaveStockEntryUseCase(h.events, stock),
  );
  const writer = {
    ...h.actor,
    role: "operator" as const,
    eventIds: [group.id],
    eventWriteIds: [group.id],
  };
  const requestId = uuid();
  const input = {
    requestId,
    entryId: requestId,
    expectedVersion: 0,
    categoryId: group.id,
    orderId: order.id,
    productId: group.products[0].id,
    quantity: 4,
  };
  await expect(
    resolve.execute({ ...writer, eventWriteIds: [] }, input),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  await expect(
    resolve.execute(writer, { ...input, quantity: 3 }),
  ).rejects.toMatchObject({ details: { code: "STOCK_CHANGED" } });
  const remaining = await resolve.execute(writer, input);
  expect(remaining).toHaveLength(1);
  expect(remaining[0].productId).toBe(group.products[1].id);
  expect(await resolve.execute(writer, input)).toEqual(remaining);
  expect(await stock.balances(group.id)).toContainEqual({
    productId: group.products[0].id,
    quantity: 4,
  });
  const second = uuid();
  expect(
    await resolve.execute(writer, {
      ...input,
      requestId: second,
      entryId: second,
      productId: group.products[1].id,
    }),
  ).toEqual([]);
  expect(await h.events.findOrder(order.id)).toEqual(before);
  const audit = (await h.events.history(group.id, 1, 15)).items.filter(
    (item) => item.resourceType === "stock",
  );
  expect(audit).toHaveLength(2);
  expect(
    audit.every(
      (item) =>
        item.actorId === writer.user.id &&
        item.actorName === writer.user.name &&
        item.after.quantity === 4 &&
        !!item.occurredAt,
    ),
  ).toBe(true);
});
it.each(["status", "withdrawal"])(
  "lista somente produtos em falta sem gravar retirada ou pagamento (%s)",
  async (operation) => {
    const box = await h.box();
    const group = await new CreateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      {
        ...eventInput(box.id),
        kind: "product_category",
        occursOn: "",
        products: [
          { id: uuid(), name: "Brigadeiro", icon: "bag", price: "10" },
          { id: uuid(), name: "Bolo", icon: "bag", price: "10" },
        ],
      },
    );
    const stock = new D1ProductStockRepository(h.db);
    for (const [index, product] of group.products.entries()) {
      const requestId = uuid();
      await new SaveStockEntryUseCase(h.events, stock).execute(h.actor, {
        requestId,
        entryId: requestId,
        categoryId: group.id,
        productId: product.id,
        expectedVersion: 0,
        quantity: index === 0 ? 2 : 10,
      });
    }
    const order = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      group.id,
      {
        requestId: uuid(),
        catalogVersion: group.version,
        customerName: "Pessoa sintética",
        pickupOn: "2026-11-22",
        note: "",
        items: group.products.map((product) => ({
          productId: product.id,
          quantity: 4,
        })),
        total: "80",
        paid: false,
        cash: "0",
        pix: "0",
      },
    );
    const before = await h.events.findOrder(order.id);
    expect(before).not.toBeNull();
    const attempt =
      operation === "status"
        ? new UpdateOrderStatusUseCase(h.events).execute(
            h.actor,
            group.id,
            order.id,
            order.version,
            {
              requestId: uuid(),
              fulfilled: true,
              payment: { method: "pix", cash: "0" },
            },
          )
        : new SaveOrderWithdrawalUseCase(h.events, stock).execute(h.actor, {
            requestId: uuid(),
            categoryId: group.id,
            orderId: order.id,
            expectedVersion: order.version,
            withdrawals: order.items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
            })),
          });
    await expect(attempt).rejects.toMatchObject({
      details: {
        code: "STOCK_INSUFFICIENT",
        stockShortages: [
          {
            productId: group.products[0].id,
            productName: "Brigadeiro",
            requested: 4,
            available: 2,
            missing: 2,
          },
        ],
      },
    });
    expect(await h.events.findOrder(order.id)).toEqual(before);
    expect(await stock.balances(group.id)).toEqual(
      expect.arrayContaining([
        { productId: group.products[0].id, quantity: 2 },
        { productId: group.products[1].id, quantity: 10 },
      ]),
    );
  },
);
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

it("adiciona todas as faltas e salva retirada e pagamento sem duplicar ao repetir", async () => {
  const box = await h.box();
  const group = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    {
      ...eventInput(box.id),
      kind: "product_category",
      occursOn: "",
      products: [
        { id: uuid(), name: "Bolo", icon: "bag", price: "10" },
        { id: uuid(), name: "Doce", icon: "bag", price: "10" },
      ],
    },
  );
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    group.id,
    {
      requestId: uuid(),
      catalogVersion: group.version,
      customerName: "Pessoa sintética",
      pickupOn: "2026-11-22",
      note: "",
      items: group.products.map((product) => ({
        productId: product.id,
        quantity: 3,
      })),
      total: "60",
      paid: false,
      cash: "0",
      pix: "0",
    },
  );
  const input = {
    requestId: uuid(),
    fulfilled: true,
    payment: { method: "pix", cash: "0" },
    stockConfirmation: group.products.map((product) => ({
      productId: product.id,
      missing: 3,
      available: 0,
    })),
  };
  const update = new UpdateOrderStatusUseCase(h.events);
  const saved = await update.execute(
    h.actor,
    group.id,
    order.id,
    order.version,
    input,
  );
  expect(saved.paid).toBe(true);
  expect(saved.withdrawals).toEqual(
    group.products.map((product) => ({ productId: product.id, quantity: 3 })),
  );
  expect(
    await update.execute(h.actor, group.id, order.id, order.version, input),
  ).toEqual(saved);
  const stock = new D1ProductStockRepository(h.db);
  for (const product of group.products) {
    const entries = await stock.entries(group.id, product.id, 1, 15);
    expect(entries.total).toBe(1);
    expect(entries.items[0]).toMatchObject({
      quantity: 3,
      createdBy: h.actor.user.id,
    });
    expect(
      (await stock.balances(group.id)).find(
        (item) => item.productId === product.id,
      )?.quantity,
    ).toBe(0);
  }
});

it("não repõe nem altera pedido quando a confirmação das faltas está desatualizada", async () => {
  const box = await h.box();
  const group = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    {
      ...eventInput(box.id),
      kind: "product_category",
      occursOn: "",
    },
  );
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    group.id,
    {
      requestId: uuid(),
      catalogVersion: group.version,
      customerName: "Pessoa sintética",
      pickupOn: "2026-11-22",
      note: "",
      items: [{ productId: group.products[0].id, quantity: 3 }],
      total: "30",
      paid: false,
      cash: "0",
      pix: "0",
    },
  );
  await expect(
    new UpdateOrderStatusUseCase(h.events).execute(
      h.actor,
      group.id,
      order.id,
      order.version,
      {
        requestId: uuid(),
        fulfilled: true,
        stockConfirmation: [
          { productId: group.products[0].id, missing: 2, available: 0 },
        ],
      },
    ),
  ).rejects.toMatchObject({ details: { code: "STOCK_CHANGED" } });
  expect(await h.events.findOrder(order.id)).toMatchObject({
    version: order.version,
    paid: false,
    withdrawals: [],
  });
  expect(
    (
      await new D1ProductStockRepository(h.db).entries(
        group.id,
        group.products[0].id,
        1,
        15,
      )
    ).total,
  ).toBe(0);
});
