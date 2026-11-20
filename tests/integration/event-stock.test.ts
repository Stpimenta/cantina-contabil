import { readFile } from "node:fs/promises";
import { unstable_splitSqlQuery } from "wrangler";
import { afterEach, beforeEach, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, uuid } from "../support/data";
import { replenishEvent } from "../support/event-stock";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "@/server/events/use-cases/update-order.use-case";
import { UpdateOrderStatusUseCase } from "@/server/events/use-cases/update-order-status.use-case";
import { DeleteOrderUseCase } from "@/server/events/use-cases/delete-order.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { D1ProductStockRepository } from "@/server/products/infrastructure/d1-product-stock.repository";
import { SaveStockEntryUseCase } from "@/server/products/use-cases/save-stock-entry.use-case";
import { DeleteStockEntryUseCase } from "@/server/products/use-cases/delete-stock-entry.use-case";
import { LoadStockEntriesUseCase } from "@/server/products/use-cases/load-stock-entries.use-case";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
async function setup(quantity = 10) {
  const box = await h.box();
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    eventInput(box.id),
  );
  if (quantity) await replenishEvent(h, event, quantity);
  const stock = new D1ProductStockRepository(h.db);
  return { event, box, stock, productId: event.products[0].id };
}
function input(productId: string, quantity: number) {
  return {
    requestId: uuid(),
    catalogVersion: 1,
    customerName: "Pessoa sintética",
    note: "",
    items: [{ productId, quantity }],
    total: "10",
    paid: false,
    cash: "0",
    pix: "0",
  };
}
it("reserva na criação, repete sem duplicar e libera só ao reduzir/excluir", async () => {
  const { event, stock, productId, box } = await setup();
  const create = new CreateOrderUseCase(h.events);
  const data = input(productId, 7);
  const order = await create.execute(h.actor, event.id, data);
  await create.execute(h.actor, event.id, data);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  await expect(
    create.execute(h.actor, event.id, input(productId, 4)),
  ).rejects.toMatchObject({
    details: {
      code: "STOCK_INSUFFICIENT",
      stockShortages: [{ productId, requested: 4, available: 3, missing: 1 }],
    },
  });
  const before = await h.events.findOrder(order.id);
  await expect(
    new UpdateOrderUseCase(h.events).execute(h.actor, event.id, order.id, 1, {
      ...input(productId, 11),
      paid: true,
      pix: "10",
    }),
  ).rejects.toMatchObject({ details: { code: "STOCK_INSUFFICIENT" } });
  expect(await h.events.findOrder(order.id)).toEqual(before);
  expect((await h.boxes.find(box.id))?.balanceCents).toBe(0);
  const reduced = await new UpdateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    1,
    input(productId, 5),
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 5,
  });
  await new DeleteOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    reduced.id,
    reduced.version,
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 10,
  });
  expect(
    (await h.events.history(event.id, 1, 15)).items.filter(
      (r) => r.resourceType === "order",
    ),
  ).toHaveLength(3);
});
it("retirada e desfazimento não liberam a reserva; redução exige desfazer antes", async () => {
  const { event, stock, productId } = await setup();
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 7),
  );
  const status = new UpdateOrderStatusUseCase(h.events);
  const done = await status.execute(h.actor, event.id, order.id, 1, {
    requestId: uuid(),
    fulfilled: true,
  });
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  await expect(
    new UpdateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order.id,
      done.version,
      input(productId, 6),
    ),
  ).rejects.toMatchObject({ details: { code: "ORDER_BELOW_WITHDRAWN" } });
  await expect(
    new DeleteOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order.id,
      done.version,
    ),
  ).rejects.toMatchObject({ details: { code: "ORDER_HAS_WITHDRAWALS" } });
  const undone = await status.execute(
    h.actor,
    event.id,
    order.id,
    done.version,
    { requestId: uuid(), fulfilled: false },
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  await new DeleteOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    undone.version,
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 10,
  });
});
it("dois pedidos concorrentes não reservam o mesmo estoque; pedido com um item em falta é atômico", async () => {
  const { event, stock, productId } = await setup();
  const outcomes = await Promise.allSettled(
    [1, 2].map(() =>
      new CreateOrderUseCase(h.events).execute(
        h.actor,
        event.id,
        input(productId, 7),
      ),
    ),
  );
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  const second = { id: uuid(), name: "Sem estoque", icon: "bag", price: "10" };
  const updated = await new UpdateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    event.id,
    1,
    {
      ...eventInput(event.cashBoxId),
      requestId: uuid(),
      products: [{ ...event.products[0], price: "10" }, second],
    },
  );
  await expect(
    new CreateOrderUseCase(h.events).execute(h.actor, event.id, {
      ...input(productId, 1),
      catalogVersion: updated.version,
      items: [
        { productId, quantity: 1 },
        { productId: second.id, quantity: 1 },
      ],
    }),
  ).rejects.toMatchObject({ details: { code: "STOCK_INSUFFICIENT" } });
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  expect((await h.events.listOrders(event.id, "", 1, 15)).total).toBe(1);
});
it("protege correção/exclusão de entradas comprometidas, autorização e auditoria", async () => {
  const { event, stock, productId } = await setup();
  await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 7),
  );
  const entry = (await stock.entries(event.id, productId, 1, 15)).items[0];
  const save = new SaveStockEntryUseCase(h.events, stock);
  const writer = {
    ...h.actor,
    role: "operator" as const,
    eventIds: [event.id],
    eventWriteIds: [event.id],
  };
  const change = {
    categoryId: event.id,
    productId,
    entryId: entry.id,
    expectedVersion: entry.version,
    requestId: uuid(),
    quantity: 6,
  };
  await expect(
    save.execute({ ...writer, eventWriteIds: [] }, change),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  await expect(save.execute(writer, change)).rejects.toMatchObject({
    details: { code: "STOCK_ENTRY_REDUCTION_BLOCKED" },
  });
  await expect(
    new DeleteStockEntryUseCase(h.events, stock).execute(writer, change),
  ).rejects.toMatchObject({
    details: { code: "STOCK_ENTRY_REDUCTION_BLOCKED" },
  });
  await save.execute(writer, { ...change, quantity: 8 });
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 1,
  });
  expect((await h.events.history(event.id, 1, 15)).items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        resourceType: "stock",
        actorId: writer.user.id,
        before: expect.objectContaining({ quantity: 10 }),
        after: expect.objectContaining({ quantity: 8 }),
      }),
    ]),
  );
  await expect(
    new LoadStockEntriesUseCase(h.events, stock).execute(
      { ...writer, eventIds: [], eventWriteIds: [] },
      event.id,
      productId,
      null,
    ),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
});
it("preserva pedidos legados na migração com zero livre e cobra apenas aumentos", async () => {
  await h.close();
  h = await harness(false, "0035_account_soft_delete.sql");
  const { event, productId } = await setup(0);
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 7),
  );
  const before = await h.events.findOrder(order.id);
  const history = await h.events.history(event.id, 1, 15);
  const migration = await readFile("migrations/0036_event_stock.sql", "utf8");
  await h.d1.batch(
    unstable_splitSqlQuery(migration).map((statement) =>
      h.d1.prepare(statement),
    ),
  );
  const stock = new D1ProductStockRepository(h.db);
  expect(await h.events.findOrder(order.id)).toEqual(before);
  expect(await h.events.history(event.id, 1, 15)).toEqual(history);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 0,
  });
  await expect(
    new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      input(productId, 1),
    ),
  ).rejects.toMatchObject({ details: { code: "STOCK_INSUFFICIENT" } });
  const edited = await new UpdateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    1,
    { ...input(productId, 7), note: "Preservado" },
  );
  await replenishEvent(h, event, 3);
  const increased = await new UpdateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    edited.version,
    input(productId, 10),
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 0,
  });
  await new DeleteOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    increased.version,
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 10,
  });
});
it("entrega concluída mantém reserva e exige desfazer antes de reduzir ou excluir", async () => {
  const box = await h.box();
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    {
      ...eventInput(box.id),
      deliveryEnabled: true,
    },
  );
  await replenishEvent(h, event, 10);
  const stock = new D1ProductStockRepository(h.db);
  const productId = event.products[0].id;
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    {
      ...input(productId, 7),
      fulfillmentMode: "pickup",
    },
  );
  const done = await new UpdateOrderStatusUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    1,
    {
      requestId: uuid(),
      fulfilled: true,
    },
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  await expect(
    new UpdateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order.id,
      done.version,
      {
        ...input(productId, 6),
        fulfillmentMode: "pickup",
        fulfilled: true,
      },
    ),
  ).rejects.toMatchObject({ details: { code: "ORDER_BELOW_WITHDRAWN" } });
  await expect(
    new DeleteOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order.id,
      done.version,
    ),
  ).rejects.toMatchObject({ details: { code: "ORDER_HAS_WITHDRAWALS" } });
  const undone = await new UpdateOrderStatusUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    done.version,
    {
      requestId: uuid(),
      fulfilled: false,
    },
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  await new UpdateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    undone.version,
    {
      ...input(productId, 6),
      fulfillmentMode: "pickup",
    },
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 4,
  });
});
