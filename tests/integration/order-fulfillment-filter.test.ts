import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, uuid } from "../support/data";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { DeleteOrderUseCase } from "@/server/events/use-cases/delete-order.use-case";
import { ListOrdersUseCase } from "@/server/events/use-cases/list-orders.use-case";
import { UpdateOrderStatusUseCase } from "@/server/events/use-cases/update-order-status.use-case";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
async function setup(deliveryEnabled = true) {
  const box = await h.box();
  const input = { ...eventInput(box.id), deliveryEnabled };
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    input,
  );
  return { box, input, event };
}
function orderInput(productId: string, customerName: string, paid = false) {
  return {
    requestId: uuid(),
    catalogVersion: 1,
    customerName,
    note: "",
    items: [{ productId, quantity: 1 }],
    total: "10",
    paid,
    cash: "0",
    pix: paid ? "10" : "0",
  };
}
describe("filtro de entregas e retiradas não concluídas", () => {
  it("combina modalidade, pagamento e busca antes de contar e paginar, sem alterar saldos", async () => {
    const { event, box } = await setup();
    const create = new CreateOrderUseCase(h.events);
    const saved = [];
    for (let i = 0; i < 17; i++) {
      saved.push(
        await create.execute(h.actor, event.id, {
          ...orderInput(
            event.products[0].id,
            `Pessoa ${String(i).padStart(2, "0")}`,
            i % 2 === 0,
          ),
          fulfillmentMode: i % 2 === 0 ? "delivery" : "pickup",
        }),
      );
    }
    for (const [i, mode] of ["delivery", "pickup"].entries()) {
      await create.execute(h.actor, event.id, {
        ...orderInput(event.products[0].id, `Pessoa concluída ${i}`, true),
        fulfillmentMode: mode,
        fulfilled: true,
      });
    }
    const removed = await create.execute(h.actor, event.id, {
      ...orderInput(event.products[0].id, "Pessoa excluída"),
      fulfillmentMode: "delivery",
    });
    await new DeleteOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      removed.id,
      removed.version,
    );
    const balances = await h.boxes.find(box.id);
    const list = new ListOrdersUseCase(h.events);
    const query = { query: "Pessoa", fulfillment: "pending" };
    const first = await list.execute(h.actor, event.id, { ...query, page: 1 });
    const second = await list.execute(h.actor, event.id, { ...query, page: 2 });
    expect(first).toMatchObject({ total: 17, page: 1, pageSize: 15 });
    expect(first.items.map((order) => order.customerName)).toEqual(
      Array.from(
        { length: 15 },
        (_, i) => `Pessoa ${String(i).padStart(2, "0")}`,
      ),
    );
    expect(second).toMatchObject({ total: 17, page: 2 });
    expect(second.items.map((order) => order.customerName)).toEqual([
      "Pessoa 15",
      "Pessoa 16",
    ]);
    const paid = await list.execute(h.actor, event.id, {
      ...query,
      status: "paid",
    });
    const pending = await list.execute(h.actor, event.id, {
      ...query,
      status: "pending",
    });
    expect(paid.total).toBe(9);
    expect(paid.items.every((order) => order.paid && !order.fulfilled)).toBe(
      true,
    );
    expect(pending.total).toBe(8);
    expect(
      pending.items.every((order) => !order.paid && !order.fulfilled),
    ).toBe(true);
    expect(
      (
        await list.execute(h.actor, event.id, { ...query, query: "Pessoa 16" })
      ).items.map((order) => order.id),
    ).toEqual([saved[16].id]);
    expect(
      (
        await list.execute(h.actor, event.id, {
          query: "Pessoa",
          fulfillment: "all",
        })
      ).total,
    ).toBe(19);
    expect(await h.boxes.find(box.id)).toEqual(balances);
    await new UpdateOrderStatusUseCase(h.events).execute(
      h.actor,
      event.id,
      saved[0].id,
      saved[0].version,
      { requestId: uuid(), fulfilled: true },
    );
    expect((await list.execute(h.actor, event.id, query)).total).toBe(16);
  });
  it("inclui legado ainda não concluído ao habilitar entregas e mantém o fluxo comum", async () => {
    const { event, input } = await setup(false);
    const old = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      orderInput(event.products[0].id, "Legado", true),
    );
    const list = new ListOrdersUseCase(h.events);
    expect(
      (await list.execute(h.actor, event.id, { fulfillment: "pending" })).total,
    ).toBe(1);
    await new UpdateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      event.id,
      event.version,
      { ...input, requestId: uuid(), deliveryEnabled: true },
    );
    const result = await list.execute(h.actor, event.id, {
      fulfillment: "pending",
      status: "paid",
    });
    expect(result.items).toMatchObject([
      { id: old.id, fulfillmentMode: null, fulfilled: false },
    ]);
    await expect(
      list.execute(null, event.id, { fulfillment: "pending" }),
    ).rejects.toMatchObject({ details: { code: "SESSION_EXPIRED" } });
    expect(
      (
        await list.execute(h.actor, event.id, {
          fulfillment: "pending",
          query: "sem correspondência",
        })
      ).total,
    ).toBe(0);
  });
});
