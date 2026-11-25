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
it("pedido sem estoque aumenta demanda sem baixar o físico e exclusão libera a pendência", async () => {
  const { event, stock, productId } = await setup(0);
  const create = new CreateOrderUseCase(h.events);
  const data = input(productId, 7);
  const order = await create.execute(h.actor, event.id, data);
  const stored = await h.events.findOrder(order.id);
  expect(stored).toMatchObject(order);
  expect(await create.execute(h.actor, event.id, data)).toEqual(stored);
  expect((await h.events.listOrders(event.id, "", 1, 15)).total).toBe(1);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 0,
  });
  expect(await stock.productionDemand(event.id)).toContainEqual(
    expect.objectContaining({ productId, allPending: 7 }),
  );
  const edited = await new UpdateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    order.version,
    input(productId, 11),
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 0,
  });
  await new DeleteOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    edited.id,
    edited.version,
  );
  expect(await stock.productionDemand(event.id)).toEqual([]);
});
it("confirma somente a falta e grava reposição, pagamento e retirada uma vez", async () => {
  const { event, stock, productId, box } = await setup(3);
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 7),
  );
  const status = new UpdateOrderStatusUseCase(h.events);
  const action = {
    requestId: uuid(),
    fulfilled: true,
    payment: { method: "pix", cash: "0" },
  };
  await expect(
    status.execute(h.actor, event.id, order.id, 1, action),
  ).rejects.toMatchObject({
    details: {
      code: "STOCK_INSUFFICIENT",
      stockShortages: [{ productId, requested: 7, available: 3, missing: 4 }],
    },
  });
  expect((await h.events.findOrder(order.id))?.version).toBe(1);
  expect((await h.boxes.find(box.id))?.balanceCents).toBe(0);
  await expect(
    status.execute(h.actor, event.id, order.id, 1, {
      ...action,
      stockConfirmation: [{ productId, available: 2, missing: 5 }],
    }),
  ).rejects.toMatchObject({ details: { code: "STOCK_CHANGED" } });
  const confirmed = {
    ...action,
    stockConfirmation: [{ productId, available: 3, missing: 4 }],
  };
  const done = await status.execute(h.actor, event.id, order.id, 1, confirmed);
  expect(
    await status.execute(h.actor, event.id, order.id, 1, confirmed),
  ).toEqual(done);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 0,
  });
  expect((await stock.entries(event.id, productId, 1, 15)).items).toHaveLength(
    2,
  );
  expect((await h.boxes.find(box.id))?.balanceCents).toBe(1000);
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
  await status.execute(h.actor, event.id, order.id, done.version, {
    requestId: uuid(),
    fulfilled: false,
  });
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 7,
  });
  expect((await h.boxes.find(box.id))?.balanceCents).toBe(1000);
});
it("aceita pedidos concorrentes sem estoque mas impede duas conclusões de consumir o mesmo saldo", async () => {
  const { event, stock, productId } = await setup(10);
  const orders = await Promise.all(
    [1, 2].map(() =>
      new CreateOrderUseCase(h.events).execute(
        h.actor,
        event.id,
        input(productId, 7),
      ),
    ),
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 10,
  });
  const outcomes = await Promise.allSettled(
    orders.map((order) =>
      new UpdateOrderStatusUseCase(h.events).execute(
        h.actor,
        event.id,
        order.id,
        1,
        { requestId: uuid(), fulfilled: true },
      ),
    ),
  );
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
});
it("protege correção de entrada já consumida, autorização e auditoria", async () => {
  const { event, stock, productId } = await setup();
  const order = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 7),
  );
  await new UpdateOrderStatusUseCase(h.events).execute(
    h.actor,
    event.id,
    order.id,
    1,
    { requestId: uuid(), fulfilled: true },
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
it("preserva snapshots legados e recompõe o físico sem inventar entrada na transição", async () => {
  await h.close();
  h = await harness(false, "0035_account_soft_delete.sql");
  const { event, productId } = await setup(0);
  // This fixture runs against the historical schema, before stock_context existed.
  const order = { id: uuid() },
    now = new Date().toISOString();
  const payload = JSON.stringify({
    customerName: "Pessoa sintética",
    note: "",
    totalCents: 1000,
    paid: false,
    cashCents: 0,
    pixCents: 0,
    fulfilled: false,
    fulfillmentMode: null,
    address: null,
    contactPhone: "",
    items: [{ ...event.products[0], quantity: 7 }],
    withdrawals: [],
  });
  await h.d1
    .prepare(
      `INSERT INTO event_orders(id,event_id,customer_name,note,total_cents,paid,catalog_version,version,created_at,created_by,created_by_name,updated_at,updated_by,updated_by_name,last_operation,fingerprint,payload_json)
    VALUES(?,?,'Pessoa sintética','',1000,0,1,1,?,?,?,?,?,?,?,'legacy-fixture',?)`,
    )
    .bind(
      order.id,
      event.id,
      now,
      h.actor.user.id,
      h.actor.user.name,
      now,
      h.actor.user.id,
      h.actor.user.name,
      order.id,
      payload,
    )
    .run();
  const before = await h.d1
    .prepare("SELECT payload_json FROM event_orders WHERE id=?")
    .bind(order.id)
    .first<{ payload_json: string }>();
  const history = await h.events.history(event.id, 1, 15);
  for (const name of [
    "0036_event_stock.sql",
    "0037_delivery_routes.sql",
    "0038_shared_product_stock.sql",
    "0039_shared_stock_deletion_guard.sql",
    "0040_event_shared_stock.sql",
  ]) {
    const migration = await readFile(`migrations/${name}`, "utf8");
    await h.d1.batch(
      unstable_splitSqlQuery(migration).map((statement) =>
        h.d1.prepare(statement),
      ),
    );
  }
  const stock = new D1ProductStockRepository(h.db);
  expect(
    await h.d1
      .prepare("SELECT payload_json FROM event_orders WHERE id=?")
      .bind(order.id)
      .first(),
  ).toEqual(before);
  expect(await h.events.history(event.id, 1, 15)).toEqual(history);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 7,
  });
  const extra = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 1),
  );
  await new DeleteOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    extra.id,
    extra.version,
  );
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
    quantity: 10,
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
it("entrega consome físico e desfazer devolve antes de reduzir ou excluir", async () => {
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
    quantity: 10,
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
    quantity: 10,
  });
});

it("migração mantém saldo físico e snapshots de evento com pedidos concluídos e pendentes", async () => {
  await h.close();
  h = await harness(false, "0039_shared_stock_deletion_guard.sql");
  const { event, productId, stock } = await setup(10);
  const first = await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 7),
  );
  await new UpdateOrderStatusUseCase(h.events).execute(
    h.actor,
    event.id,
    first.id,
    1,
    { requestId: uuid(), fulfilled: true },
  );
  await new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    input(productId, 1),
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 2,
  });
  const snapshots = (
    await h.d1
      .prepare("SELECT id,payload_json,version FROM event_orders ORDER BY id")
      .all()
  ).results;
  const audit = (
    await h.d1.prepare("SELECT * FROM event_audit ORDER BY id").all()
  ).results;
  const entries = (
    await h.d1.prepare("SELECT * FROM product_stock_entries ORDER BY id").all()
  ).results;
  const migration = await readFile(
    "migrations/0040_event_shared_stock.sql",
    "utf8",
  );
  await h.d1.batch(
    unstable_splitSqlQuery(migration).map((q) => h.d1.prepare(q)),
  );
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 3,
  });
  expect(
    (
      await h.d1
        .prepare("SELECT id,payload_json,version FROM event_orders ORDER BY id")
        .all()
    ).results,
  ).toEqual(snapshots);
  expect(
    (await h.d1.prepare("SELECT * FROM event_audit ORDER BY id").all()).results,
  ).toEqual(audit);
  expect(
    (
      await h.d1
        .prepare("SELECT * FROM product_stock_entries ORDER BY id")
        .all()
    ).results,
  ).toEqual(entries);
  expect(await stock.productionDemand(event.id)).toContainEqual(
    expect.objectContaining({ productId, allPending: 1 }),
  );
});

it("cadastro já concluído repõe somente após confirmação e repete sem duplicar entradas", async () => {
  const box = await h.box();
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    {
      ...eventInput(box.id),
      deliveryEnabled: true,
    },
  );
  await replenishEvent(h, event, 3);
  const productId = event.products[0].id,
    create = new CreateOrderUseCase(h.events);
  const data = {
    ...input(productId, 8),
    fulfillmentMode: "pickup",
    fulfilled: true,
  };
  await expect(create.execute(h.actor, event.id, data)).rejects.toMatchObject({
    details: { code: "STOCK_INSUFFICIENT" },
  });
  expect(await h.events.findOrder(data.requestId)).toBeNull();
  const confirmed = {
    ...data,
    stockConfirmation: [{ productId, available: 3, missing: 5 }],
  };
  const saved = await create.execute(h.actor, event.id, confirmed);
  const stored = await h.events.findOrder(saved.id);
  expect(stored).toMatchObject(saved);
  expect(await create.execute(h.actor, event.id, confirmed)).toEqual(stored);
  expect((await h.events.listOrders(event.id, "", 1, 15)).total).toBe(1);
  const stock = new D1ProductStockRepository(h.db);
  expect(await stock.balances(event.id)).toContainEqual({
    productId,
    quantity: 0,
  });
  expect((await stock.entries(event.id, productId, 1, 15)).items).toHaveLength(
    2,
  );
});
