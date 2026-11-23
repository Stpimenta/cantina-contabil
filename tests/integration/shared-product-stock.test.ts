import { PrepareStockImportsUseCase } from "@/server/products/use-cases/prepare-stock-imports.use-case";
import { LoadStockImportOptionsUseCase } from "@/server/products/use-cases/load-stock-import-options.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import type { StockLinkOperation } from "@/server/products/models/shared-stock.model";
import type { StockImportOption } from "@/server/products/models/stock-import-option.model";
import { readFile } from "node:fs/promises";
import { unstable_splitSqlQuery } from "wrangler";
import { afterEach, beforeEach, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, uuid } from "../support/data";
import type { Event } from "@/server/events/models/event.model";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderStatusUseCase } from "@/server/events/use-cases/update-order-status.use-case";
import { D1ProductStockRepository } from "@/server/products/infrastructure/d1-product-stock.repository";
import { D1SharedStockRepository } from "@/server/products/infrastructure/d1-shared-stock.repository";
import { ManageSharedStockUseCase } from "@/server/products/use-cases/manage-shared-stock.use-case";
import { SaveStockEntryUseCase } from "@/server/products/use-cases/save-stock-entry.use-case";
import { DeleteStockEntryUseCase } from "@/server/products/use-cases/delete-stock-entry.use-case";
import { GetProductStockUseCase } from "@/server/products/use-cases/get-product-stock.use-case";
import { GetProductionPlanUseCase } from "@/server/products/use-cases/get-production-plan.use-case";
import { LoadSharedStockUseCase } from "@/server/products/use-cases/load-shared-stock.use-case";
import { stockContext } from "@/server/products/models/shared-stock.model";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
function repos() {
  const stock = new D1ProductStockRepository(h.db),
    shared = new D1SharedStockRepository(h.db);
  return {
    stock,
    shared,
    manage: new ManageSharedStockUseCase(h.events, shared),
    save: new SaveStockEntryUseCase(h.events, stock, shared),
    status: new UpdateOrderStatusUseCase(h.events, undefined, shared),
  };
}
async function category(name: string, price = "10", count = 1) {
  const box = await h.box(`Caixa ${uuid()}`);
  return new CreateEventUseCase(h.events, h.boxes).execute(h.actor, {
    ...eventInput(box.id),
    name,
    kind: "product_category",
    occursOn: "",
    products: Array.from({ length: count }, (_, i) => ({
      id: uuid(),
      name: `${name} ${i + 1}`,
      icon: "bag",
      price,
    })),
  });
}
async function add(group: Event, quantity: number, index = 0) {
  const id = uuid();
  return repos().save.execute(h.actor, {
    requestId: id,
    entryId: id,
    expectedVersion: 0,
    categoryId: group.id,
    productId: group.products[index].id,
    quantity,
  });
}
async function linkInput(a: Event, b: Event, sourceIndex = 0, targetIndex = 0) {
  const { shared } = repos();
  const source = await shared.members(a.id, [a.products[sourceIndex].id]),
    target = await shared.members(b.id, [b.products[targetIndex].id]);
  return {
    requestId: uuid(),
    action: "link" as const,
    categoryId: a.id,
    productId: a.products[sourceIndex].id,
    targetCategoryId: b.id,
    targetProductId: b.products[targetIndex].id,
    quantity: 0,
    context: stockContext([...source, ...target]),
    expectedQuantity: source[0].quantity,
    targetQuantity: target[0].quantity,
  };
}
async function unlinkInput(a: Event, quantity: number) {
  const members = await repos().shared.members(a.id, [a.products[0].id]);
  return {
    requestId: uuid(),
    action: "unlink" as const,
    categoryId: a.id,
    productId: a.products[0].id,
    quantity,
    context: stockContext(members),
    expectedQuantity: members[0].quantity,
    targetQuantity: 0,
  };
}
async function order(
  group: Event,
  quantity: number,
  items = group.products.slice(0, 1),
) {
  return new CreateOrderUseCase(h.events, undefined, repos().shared).execute(
    h.actor,
    group.id,
    {
      requestId: uuid(),
      catalogVersion: group.version,
      customerName: "Pessoa sintética",
      pickupOn: "2026-11-22",
      note: "",
      items: items.map((p) => ({ productId: p.id, quantity })),
      total: String(
        items.reduce((s, p) => s + p.priceCents * quantity, 0) / 100,
      ),
      paid: false,
      cash: "0",
      pix: "0",
    },
  );
}
async function balance(group: Event, index = 0) {
  return (
    (await repos().stock.balances(group.id)).find(
      (b) => b.productId === group.products[index].id,
    )?.quantity ?? 0
  );
}

async function available(group: Event, index = 0) {
  const { stock, shared } = repos();
  const balances = await new GetProductStockUseCase(
    h.events,
    stock,
    shared,
  ).execute(h.actor, group.id);
  return balances.find((row) => row.productId === group.products[index].id)
    ?.availableQuantity;
}

it("soma estoques de três produtos, consolida demanda sem duplicar saldo e preserva preços e caixas", async () => {
  const a = await category("Interno", "10"),
    b = await category("Externo", "15"),
    c = await category("Terceiro", "20");
  await add(a, 5);
  await add(b, 3);
  const { manage, stock, shared } = repos();
  const input = await linkInput(a, b);
  await manage.execute(h.actor, input);
  await manage.execute(h.actor, input);
  await manage.execute(h.actor, await linkInput(a, c));
  await order(a, 10);
  await order(b, 15);
  await order(c, 2);
  expect(await balance(a)).toBe(8);
  expect(await balance(b)).toBe(8);
  expect(await balance(c)).toBe(8);
  expect(await available(a)).toBe(0);
  expect(await available(b)).toBe(0);
  expect(await available(c)).toBe(0);
  const plan = await new GetProductionPlanUseCase(
    h.events,
    stock,
    shared,
  ).execute(h.actor, a.id, "all");
  expect(plan).toHaveLength(1);
  expect(plan[0]).toMatchObject({ pending: 27, physical: 8, toProduce: 19 });
  expect(plan[0].scenarios).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: "Consolidado",
        pending: 27,
        toProduce: 19,
      }),
      expect.objectContaining({
        label: "Interno 1 — Interno",
        pending: 10,
        toProduce: 2,
      }),
      expect.objectContaining({
        label: "Externo 1 — Externo",
        pending: 15,
        toProduce: 7,
      }),
    ]),
  );
  expect(await h.events.find(a.id)).toMatchObject({
    cashBoxId: a.cashBoxId,
    pendingCents: 10000,
  });
  expect(await h.events.find(b.id)).toMatchObject({
    cashBoxId: b.cashBoxId,
    pendingCents: 22500,
  });
  expect((await h.events.find(a.id))?.products[0].priceCents).toBe(1000);
  expect((await h.events.find(b.id))?.products[0].priceCents).toBe(1500);
});

it("retirada usa saldo comum; desfazer devolve uma vez e correção por outro produto preserva origem", async () => {
  const a = await category("Interno"),
    b = await category("Externo");
  const entry = await add(a, 20);
  const { manage, stock, save, status } = repos();
  await manage.execute(h.actor, await linkInput(a, b));
  expect(await available(a)).toBe(20);
  const o = await order(b, 6);
  expect(await balance(a)).toBe(20);
  expect(await available(a)).toBe(14);
  expect(await available(b)).toBe(14);
  const done = await status.execute(h.actor, b.id, o.id, o.version, {
    requestId: uuid(),
    fulfilled: true,
  });
  expect(await balance(a)).toBe(14);
  expect(await available(a)).toBe(14);
  expect(await available(b)).toBe(14);
  const correction = {
    requestId: uuid(),
    entryId: entry.id,
    expectedVersion: entry.version,
    categoryId: b.id,
    productId: b.products[0].id,
    quantity: 18,
  };
  await save.execute(h.actor, correction);
  expect(await balance(a)).toBe(12);
  expect(await balance(b)).toBe(12);
  expect(
    (await stock.entries(b.id, b.products[0].id, 1, 15)).items[0],
  ).toMatchObject({
    eventId: a.id,
    productId: a.products[0].id,
    productName: "Interno 1",
  });
  const undo = { requestId: uuid(), fulfilled: false };
  await status.execute(h.actor, b.id, o.id, done.version, undo);
  await status.execute(h.actor, b.id, o.id, done.version, undo);
  expect(await balance(a)).toBe(18);
  expect(await available(a)).toBe(12);
  expect(await available(b)).toBe(12);
  const histories = await repos().shared.history(b.id, b.products[0].id, 1, 15);
  expect(histories.items.some((row) => row.action === "withdrawal")).toBe(true);
});

it("dois produtos vinculados no mesmo pedido não gastam o saldo duas vezes e repõem somente a falta total", async () => {
  const a = await category("Dois preços", "10", 2);
  await add(a, 5);
  const { manage, status, shared } = repos();
  await manage.execute(h.actor, await linkInput(a, a, 0, 1));
  const o = await order(a, 4, a.products);
  await expect(
    status.execute(h.actor, a.id, o.id, o.version, {
      requestId: uuid(),
      fulfilled: true,
    }),
  ).rejects.toMatchObject({
    details: {
      code: "STOCK_INSUFFICIENT",
      stockShortages: [{ requested: 8, available: 5, missing: 3 }],
    },
  });
  expect(await balance(a)).toBe(5);
  expect((await h.events.findOrder(o.id))?.version).toBe(1);
  const confirm = {
    requestId: uuid(),
    fulfilled: true,
    stockConfirmation: [
      { productId: a.products[0].id, available: 5, missing: 3 },
    ],
  };
  await status.execute(h.actor, a.id, o.id, o.version, confirm);
  await status.execute(h.actor, a.id, o.id, o.version, confirm);
  expect(await balance(a)).toBe(0);
  expect(await balance(a, 1)).toBe(0);
  expect((await shared.members(a.id, [a.products[0].id])).length).toBe(2);
  const plan = await new GetProductionPlanUseCase(
    h.events,
    repos().stock,
    shared,
  ).execute(h.actor, a.id, "all");
  expect(plan).toHaveLength(1);
  expect(plan[0].pending).toBe(0);
});

it("desvincula com saldo escolhido, mantém a soma e permite religar sem criar estoque", async () => {
  const a = await category("Interno"),
    b = await category("Externo");
  await add(a, 20);
  const { manage, status } = repos();
  await manage.execute(h.actor, await linkInput(a, b));
  const o = await order(b, 6);
  const done = await status.execute(h.actor, b.id, o.id, o.version, {
    requestId: uuid(),
    fulfilled: true,
  });
  const detach = await unlinkInput(b, 4);
  await manage.execute(h.actor, detach);
  await manage.execute(h.actor, detach);
  expect(await balance(a)).toBe(10);
  expect(await balance(b)).toBe(4);
  await status.execute(h.actor, b.id, o.id, done.version, {
    requestId: uuid(),
    fulfilled: false,
  });
  expect(await balance(a)).toBe(10);
  expect(await balance(b)).toBe(10);
  await manage.execute(h.actor, await linkInput(a, b));
  expect(await balance(a)).toBe(20);
  expect(await balance(b)).toBe(20);
});

it("exige alteração em todos os grupos para vínculo, reposição, correção, exclusão e retirada", async () => {
  const a = await category("Interno"),
    b = await category("Externo");
  const entry = await add(a, 10);
  const { manage, save, status, stock, shared } = repos();
  const operator = {
    ...h.actor,
    role: "operator" as const,
    eventIds: [a.id, b.id],
    eventWriteIds: [a.id],
  };
  await expect(
    manage.execute(operator, await linkInput(a, b)),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  await manage.execute(h.actor, await linkInput(a, b));
  const req = uuid();
  await expect(
    save.execute(operator, {
      requestId: req,
      entryId: req,
      expectedVersion: 0,
      categoryId: a.id,
      productId: a.products[0].id,
      quantity: 3,
    }),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  await expect(
    save.execute(operator, {
      requestId: uuid(),
      entryId: entry.id,
      expectedVersion: 1,
      categoryId: a.id,
      productId: a.products[0].id,
      quantity: 8,
    }),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  await expect(
    new DeleteStockEntryUseCase(h.events, stock, shared).execute(operator, {
      requestId: uuid(),
      entryId: entry.id,
      expectedVersion: 1,
      categoryId: a.id,
      productId: a.products[0].id,
    }),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  const o = await order(a, 2);
  await expect(
    status.execute(operator, a.id, o.id, 1, {
      requestId: uuid(),
      fulfilled: true,
    }),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  await expect(
    manage.execute(operator, await unlinkInput(a, 2)),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  expect(await balance(a)).toBe(10);
  const hidden = await new LoadSharedStockUseCase(h.events, shared)
    .execute(
      { ...operator, eventIds: [a.id], eventWriteIds: [a.id] },
      a.id,
      a.products[0].id,
    )
    .catch((error) => error);
  expect(hidden).toMatchObject({ details: { code: "ACCESS_DENIED" } });
});

it("rejeita retrato antigo, saldo excessivo e produto de evento sem modificar estoque", async () => {
  const a = await category("Interno"),
    b = await category("Externo"),
    c = await category("Outro");
  await add(a, 10);
  const { manage } = repos(),
    stale = await linkInput(a, b);
  await manage.execute(h.actor, await linkInput(a, c));
  await expect(manage.execute(h.actor, stale)).rejects.toMatchObject({
    details: { code: "STOCK_CHANGED" },
  });
  await expect(
    manage.execute(h.actor, await unlinkInput(a, 11)),
  ).rejects.toMatchObject({ details: { code: "INVALID_STOCK_INPUT" } });
  const box = await h.box(`Caixa ${uuid()}`),
    event = await new CreateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      eventInput(box.id),
    );
  await expect(
    manage.execute(h.actor, {
      ...(await linkInput(a, b)),
      targetCategoryId: event.id,
      targetProductId: event.products[0].id,
    }),
  ).rejects.toMatchObject({ details: { code: "EVENT_NOT_FOUND" } });
  expect(await balance(a)).toBe(10);
  expect(await balance(b)).toBe(0);
});

it("duas retiradas concorrentes em grupos distintos não produzem estoque negativo", async () => {
  const a = await category("Interno"),
    b = await category("Externo");
  await add(a, 5);
  const { manage, status } = repos();
  await manage.execute(h.actor, await linkInput(a, b));
  const first = await order(a, 4),
    second = await order(b, 4);
  const results = await Promise.allSettled([
    status.execute(h.actor, a.id, first.id, 1, {
      requestId: uuid(),
      fulfilled: true,
    }),
    status.execute(h.actor, b.id, second.id, 1, {
      requestId: uuid(),
      fulfilled: true,
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(await balance(a)).toBe(1);
  expect(await balance(b)).toBe(1);
});

it("migração preserva entrada e auditoria existentes antes de permitir vínculos", async () => {
  await h.close();
  h = await harness(false, "0037_delivery_routes.sql");
  const a = await category("Legado interno"),
    b = await category("Legado externo");
  const id = uuid(),
    now = new Date().toISOString();
  await h.d1
    .prepare(
      `INSERT INTO product_stock_entries(id,event_id,product_id,quantity,version,created_at,created_by,created_by_name,updated_at,updated_by,updated_by_name,last_operation,fingerprint)
 VALUES(?,?,?,12,1,?,?,?,?,?,?,?,'legacy')`,
    )
    .bind(
      id,
      a.id,
      a.products[0].id,
      now,
      h.actor.user.id,
      h.actor.user.name,
      now,
      h.actor.user.id,
      h.actor.user.name,
      id,
    )
    .run();
  const before = await h.d1
    .prepare("SELECT * FROM product_stock_entries WHERE id=?")
    .bind(id)
    .first();
  const audit = await h.d1
    .prepare("SELECT * FROM product_stock_audit ORDER BY id")
    .all();
  const migration = await readFile(
    "migrations/0038_shared_product_stock.sql",
    "utf8",
  );
  await h.d1.batch(
    unstable_splitSqlQuery(migration).map((statement) =>
      h.d1.prepare(statement),
    ),
  );
  expect(
    await h.d1
      .prepare("SELECT * FROM product_stock_entries WHERE id=?")
      .bind(id)
      .first(),
  ).toMatchObject(before!);
  const afterAudit = await h.d1
    .prepare("SELECT * FROM product_stock_audit ORDER BY id")
    .all();
  expect(afterAudit.results).toEqual(audit.results);
  expect(await balance(a)).toBe(12);
  expect(await balance(b)).toBe(0);
  await repos().manage.execute(h.actor, await linkInput(a, b));
  expect(await balance(b)).toBe(12);
});

function selectedProducts(options: StockImportOption[]) {
  const rows = options.map((option) => ({ option, id: uuid() }));
  return {
    products: rows.map(({ option, id }) => ({
      id,
      name: option.product.name,
      icon: option.product.icon,
      price: String(option.product.priceCents / 100),
    })),
    stockImports: rows.map(({ option, id }) => ({
      productId: id,
      operationId: uuid(),
      sourceCategoryId: option.sourceCategoryId,
      sourceProductId: option.sourceProductId,
      sourceStockId: option.sourceStockId,
      context: option.context,
      expectedQuantity: option.quantity,
    })),
  };
}
function importing() {
  const shared = repos().shared;
  return {
    options: new LoadStockImportOptionsUseCase(h.events, shared),
    create: new CreateEventUseCase(
      h.events,
      h.boxes,
      new PrepareStockImportsUseCase(h.events, shared),
    ),
    update: new UpdateEventUseCase(
      h.events,
      h.boxes,
      new PrepareStockImportsUseCase(h.events, shared),
    ),
  };
}
function groupDraft(group: Event) {
  return {
    requestId: uuid(),
    kind: "product_category",
    cashBoxId: group.cashBoxId,
    name: group.name,
    description: group.description,
    occursOn: "",
    products: group.products.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      price: String(p.priceCents / 100),
    })),
  };
}

it("traz produtos selecionados para grupo vazio e mantém preços próprios sem duplicar estoque", async () => {
  const a = await category("Origem A", "10"),
    b = await category("Origem B", "15"),
    empty = await category("Destino", "10", 0);
  await add(a, 12);
  await add(b, 7);
  const api = importing(),
    available = await api.options.execute(h.actor, empty.id);
  const selected = selectedProducts(
    available.filter((option) =>
      [a.id, b.id].includes(option.sourceCategoryId),
    ),
  );
  selected.products.find((p) => p.name === "Origem A 1")!.price = "8";
  const input = { ...groupDraft(empty), ...selected };
  const saved = await api.update.execute(
    h.actor,
    empty.id,
    empty.version,
    input,
  );
  expect(saved.products).toHaveLength(2);
  expect(
    await api.update.execute(h.actor, empty.id, empty.version, input),
  ).toMatchObject(saved);
  expect(await balance(a)).toBe(12);
  expect(await balance(b)).toBe(7);
  expect(
    (await repos().stock.balances(empty.id))
      .map((row) => row.quantity)
      .sort((a, b) => a - b),
  ).toEqual([7, 12]);
  expect((await h.events.find(a.id))?.products[0].priceCents).toBe(1000);
  expect(saved.products.find((p) => p.name === "Origem A 1")?.priceCents).toBe(
    800,
  );
  expect(
    (await api.options.execute(h.actor, empty.id)).filter((option) =>
      [a.id, b.id].includes(option.sourceCategoryId),
    ),
  ).toEqual([]);
  const copied = saved.products.find((p) => p.name === "Origem A 1")!;
  const o = await order(saved, 3, [copied]);
  await repos().status.execute(h.actor, saved.id, o.id, 1, {
    requestId: uuid(),
    fulfilled: true,
  });
  expect(await balance(a)).toBe(9);
  expect(await balance(b)).toBe(7);
  expect(await h.events.find(empty.id)).toMatchObject({
    cashBoxId: empty.cashBoxId,
    pendingCents: 2400,
  });
  expect(await h.events.find(a.id)).toMatchObject({
    cashBoxId: a.cashBoxId,
    pendingCents: 0,
  });
});

it("permite criar um grupo novo já com produtos existentes vinculados", async () => {
  const source = await category("Origem");
  await add(source, 9);
  const api = importing();
  const selection = selectedProducts(
    (await api.options.execute(h.actor)).filter(
      (option) => option.sourceCategoryId === source.id,
    ),
  );
  const box = await h.box(`Destino ${uuid()}`),
    input = {
      ...eventInput(box.id),
      name: "Novo grupo com vínculo",
      kind: "product_category",
      occursOn: "",
      ...selection,
    };
  const saved = await api.create.execute(h.actor, input);
  expect(saved.products).toHaveLength(1);
  expect(await balance(saved)).toBe(9);
  expect(await balance(source)).toBe(9);
  expect(await api.create.execute(h.actor, input)).toMatchObject(saved);
  expect(
    await repos().shared.members(source.id, [source.products[0].id]),
  ).toHaveLength(2);
});

it("bloqueia duplicatas na seleção e em grupo que já usa aquele estoque", async () => {
  const source = await category("Origem"),
    empty = await category("Destino", "10", 0);
  const api = importing();
  const option = (await api.options.execute(h.actor, empty.id)).find(
    (row) => row.sourceCategoryId === source.id,
  )!;
  const duplicate = selectedProducts([option, option]);
  await expect(
    api.update.execute(h.actor, empty.id, 1, {
      ...groupDraft(empty),
      ...duplicate,
    }),
  ).rejects.toMatchObject({ details: { code: "STOCK_IMPORT_DUPLICATE" } });
  expect((await h.events.find(empty.id))?.products).toEqual([]);
  const first = await api.update.execute(h.actor, empty.id, 1, {
    ...groupDraft(empty),
    ...selectedProducts([option]),
  });
  const currentOption = (await api.options.execute(h.actor)).find(
    (row) => row.sourceCategoryId === source.id,
  )!;
  const again = selectedProducts([currentOption]);
  await expect(
    api.update.execute(h.actor, first.id, first.version, {
      ...groupDraft(first),
      products: [...groupDraft(first).products, ...again.products],
      stockImports: again.stockImports,
    }),
  ).rejects.toMatchObject({ details: { code: "STOCK_IMPORT_DUPLICATE" } });
  expect((await h.events.find(first.id))?.products).toHaveLength(1);
});

it("importação exige alteração no destino e em todos os participantes do estoque de origem", async () => {
  const a = await category("Origem"),
    b = await category("Vinculado"),
    destination = await category("Destino", "10", 0);
  await repos().manage.execute(h.actor, await linkInput(a, b));
  const api = importing(),
    selection = selectedProducts([
      (await api.options.execute(h.actor, destination.id)).find(
        (option) => option.sourceCategoryId === a.id,
      )!,
    ]);
  const operator = {
    ...h.actor,
    role: "operator" as const,
    eventIds: [a.id, b.id, destination.id],
    eventWriteIds: [a.id, destination.id],
  };
  expect(await api.options.execute(operator, destination.id)).toEqual([]);
  await expect(
    api.update.execute(operator, destination.id, 1, {
      ...groupDraft(destination),
      ...selection,
    }),
  ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  expect((await h.events.find(destination.id))?.products).toEqual([]);
});

it("falha no segundo vínculo reverte catálogo e primeiro vínculo juntos", async () => {
  const a = await category("Origem A"),
    b = await category("Origem B"),
    destination = await category("Destino", "10", 0);
  await add(a, 10);
  await add(b, 5);
  const api = importing(),
    selection = selectedProducts(
      (await api.options.execute(h.actor, destination.id))
        .filter((option) => [a.id, b.id].includes(option.sourceCategoryId))
        .sort((left, right) =>
          left.sourceCategoryId === a.id
            ? -1
            : right.sourceCategoryId === a.id
              ? 1
              : 0,
        ),
    );
  const before = await h.events.find(destination.id),
    members = await repos().shared.members(a.id, [a.products[0].id]);
  class ConcurrentRepository extends D1EventRepository {
    override async update(
      event: Event,
      expected: number,
      links?: StockLinkOperation[],
    ) {
      await add(b, 1);
      return super.update(event, expected, links);
    }
  }
  const concurrent = new ConcurrentRepository(h.db);
  const update = new UpdateEventUseCase(
    concurrent,
    h.boxes,
    new PrepareStockImportsUseCase(h.events, repos().shared),
  );
  await expect(
    update.execute(h.actor, destination.id, 1, {
      ...groupDraft(destination),
      ...selection,
    }),
  ).rejects.toMatchObject({ details: { code: "STOCK_CHANGED" } });
  expect(await h.events.find(destination.id)).toEqual(before);
  expect(await repos().shared.members(a.id, [a.products[0].id])).toEqual(
    members,
  );
  expect(await balance(a)).toBe(10);
  expect(await balance(b)).toBe(6);
});
