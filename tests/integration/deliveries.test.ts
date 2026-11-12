import { UpdateOrderStatusUseCase } from "@/server/events/use-cases/update-order-status.use-case";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, uuid } from "../support/data";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "@/server/events/use-cases/update-order.use-case";
import { DeleteOrderUseCase } from "@/server/events/use-cases/delete-order.use-case";
import { emptyOrderAddress } from "@/server/events/inputs/order-delivery.input";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
async function setup(enabled = true) {
  const box = await h.box();
  const input = { ...eventInput(box.id), deliveryEnabled: enabled };
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    input,
  );
  const order = {
    requestId: uuid(),
    catalogVersion: event.version,
    customerName: "Recebedor sintético",
    note: "",
    items: [{ productId: event.products[0].id, quantity: 1 }],
    total: "10",
    paid: false,
    cash: "0",
    pix: "0",
  };
  return { box, input, event, order };
}
const address = {
  ...emptyOrderAddress,
  street: "Rua de teste",
  number: "1",
  neighborhood: "Centro",
  city: "Cidade sintética",
  state: "SP",
};
describe("entregas e retiradas", () => {
  it.each([
    { method: "pix", cash: "0", cashCents: 0, pixCents: 1000 },
    { method: "cash", cash: "0", cashCents: 1000, pixCents: 0 },
    { method: "mixed", cash: "3", cashCents: 300, pixCents: 700 },
  ])(
    "pagamento rápido $method preserva dados e recalcula sem duplicidade",
    async ({ method, cash, cashCents, pixCents }) => {
      const { box, event, order } = await setup();
      const saved = await new CreateOrderUseCase(h.events).execute(
        h.actor,
        event.id,
        {
          ...order,
          fulfillmentMode: "delivery",
          address,
          contactPhone: "11999999999",
        },
      );
      const pay = new UpdateOrderStatusUseCase(h.events);
      const payment = { requestId: uuid(), payment: { method, cash } };
      const paid = await pay.execute(
        h.actor,
        event.id,
        saved.id,
        saved.version,
        payment,
      );
      expect(paid).toMatchObject({
        paid: true,
        totalCents: 1000,
        cashCents,
        pixCents,
        address,
        fulfillmentMode: "delivery",
        fulfilled: false,
        contactPhone: "11999999999",
        items: saved.items,
      });
      expect(
        await pay.execute(h.actor, event.id, saved.id, saved.version, payment),
      ).toMatchObject(paid);
      await expect(
        pay.execute(h.actor, event.id, saved.id, saved.version, {
          ...payment,
          requestId: uuid(),
        }),
      ).rejects.toMatchObject({ details: { code: "EVENT_CHANGED" } });
      expect(await h.boxes.find(box.id)).toMatchObject({
        balanceCents: 1000,
        pendingCents: 0,
      });
      expect(await h.events.find(event.id)).toMatchObject({
        realCents: 1000,
        pendingCents: 0,
        soldUnits: 1,
        cashCents,
        pixCents,
      });
      expect((await h.events.history(event.id, 1, 15)).items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            before: expect.objectContaining({ paid: false }),
            after: expect.objectContaining({ paid: true, address }),
            actorName: h.actor.user.name,
          }),
        ]),
      );
    },
  );
  it("pagamento rápido de legado não exige modalidade e recusa acesso ou parcela inválida sem gravar", async () => {
    const { event, input, order } = await setup(false);
    const saved = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order,
    );
    await new UpdateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      event.id,
      event.version,
      { ...input, requestId: uuid(), deliveryEnabled: true },
    );
    const pay = new UpdateOrderStatusUseCase(h.events);
    await expect(
      pay.execute(null, event.id, saved.id, saved.version, {
        requestId: uuid(),
        payment: { method: "pix", cash: "0" },
      }),
    ).rejects.toMatchObject({ details: { code: "SESSION_EXPIRED" } });
    await expect(
      pay.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        payment: { method: "mixed", cash: "11" },
      }),
    ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      version: saved.version,
      paid: false,
    });
    expect(
      await pay.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        payment: { method: "pix", cash: "0" },
      }),
    ).toMatchObject({ paid: true, fulfillmentMode: null });
  });

  it.each(["delivery", "pickup"] as const)(
    "conclui e desfaz %s sem receber pagamento nem alterar dados",
    async (fulfillmentMode) => {
      const { event, box, order } = await setup();
      const saved = await new CreateOrderUseCase(h.events).execute(
        h.actor,
        event.id,
        {
          ...order,
          fulfillmentMode,
          ...(fulfillmentMode === "delivery" ? { address } : {}),
          contactPhone: "11999999999",
          note: "Preservar observação",
        },
      );
      const update = new UpdateOrderStatusUseCase(h.events);
      const input = { requestId: uuid(), fulfilled: true };
      const done = await update.execute(
        h.actor,
        event.id,
        saved.id,
        saved.version,
        input,
      );
      expect(done).toMatchObject({
        paid: false,
        cashCents: 0,
        pixCents: 0,
        fulfilled: true,
        fulfillmentMode,
        address: saved.address,
        contactPhone: saved.contactPhone,
        items: saved.items,
        note: saved.note,
        totalCents: 1000,
      });
      expect(
        await update.execute(h.actor, event.id, saved.id, saved.version, input),
      ).toEqual(done);
      const undone = await update.execute(
        h.actor,
        event.id,
        done.id,
        done.version,
        { requestId: uuid(), fulfilled: false },
      );
      expect(undone).toMatchObject({ paid: false, fulfilled: false });
      expect(await h.boxes.find(box.id)).toMatchObject({
        balanceCents: 0,
        pendingCents: 1000,
      });
      expect((await h.events.history(event.id, 1, 15)).items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            before: expect.objectContaining({ fulfilled: false }),
            after: expect.objectContaining({ fulfilled: true, paid: false }),
          }),
        ]),
      );
    },
  );
  it("salva pagamento e entrega juntos uma única vez e permite só entrega em pedido pago", async () => {
    const { event, box, order } = await setup();
    const saved = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      { ...order, fulfillmentMode: "delivery", address },
    );
    const update = new UpdateOrderStatusUseCase(h.events);
    const before = (await h.events.history(event.id, 1, 15)).items.length;
    const input = {
      requestId: uuid(),
      payment: { method: "mixed", cash: "3" },
      fulfilled: true,
    };
    const done = await update.execute(
      h.actor,
      event.id,
      saved.id,
      saved.version,
      input,
    );
    expect(done).toMatchObject({
      paid: true,
      fulfilled: true,
      cashCents: 300,
      pixCents: 700,
      address,
      items: saved.items,
    });
    expect(
      await update.execute(h.actor, event.id, saved.id, saved.version, input),
    ).toEqual(done);
    expect((await h.events.history(event.id, 1, 15)).items).toHaveLength(
      before + 1,
    );
    const changed = await update.execute(
      h.actor,
      event.id,
      done.id,
      done.version,
      { requestId: uuid(), fulfilled: false },
    );
    expect(changed).toMatchObject({
      paid: true,
      fulfilled: false,
      cashCents: 300,
      pixCents: 700,
    });
    await expect(
      update.execute(h.actor, event.id, changed.id, changed.version, {
        requestId: uuid(),
        payment: { method: "pix", cash: "0" },
      }),
    ).rejects.toMatchObject({ details: { code: "EVENT_CHANGED" } });
    expect(await h.boxes.find(box.id)).toMatchObject({
      balanceCents: 1000,
      pendingCents: 0,
    });
  });
  it("recusa atualização parcial inválida sem concluir entrega ou alterar saldo", async () => {
    const { event, order } = await setup();
    const saved = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      { ...order, fulfillmentMode: "pickup" },
    );
    const update = new UpdateOrderStatusUseCase(h.events);
    await expect(
      update.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        payment: { method: "mixed", cash: "11" },
        fulfilled: true,
      }),
    ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      version: saved.version,
      paid: false,
      fulfilled: false,
    });
    const outcomes = await Promise.allSettled([
      update.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        fulfilled: true,
      }),
      update.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        payment: { method: "pix", cash: "0" },
      }),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected"),
    ).toHaveLength(1);
    const current = await h.events.findOrder(saved.id);
    expect(Number(current!.paid) + Number(current!.fulfilled)).toBe(1);
    await new DeleteOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      current!.id,
      current!.version,
    );
    await expect(
      update.execute(h.actor, event.id, current!.id, current!.version, {
        requestId: uuid(),
        fulfilled: true,
      }),
    ).rejects.toMatchObject({ details: { code: "EVENT_NOT_FOUND" } });
  });
  it("exige modalidade para conclusão rápida e preserva pagamento do legado", async () => {
    const { event, order, input } = await setup(false);
    const saved = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order,
    );
    const update = new UpdateOrderStatusUseCase(h.events);
    await expect(
      update.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        fulfilled: true,
      }),
    ).rejects.toMatchObject({ details: { code: "EVENT_DELIVERY_DISABLED" } });
    await new UpdateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      event.id,
      event.version,
      { ...input, requestId: uuid(), deliveryEnabled: true },
    );
    await expect(
      update.execute(h.actor, event.id, saved.id, saved.version, {
        requestId: uuid(),
        payment: { method: "pix", cash: "0" },
        fulfilled: true,
      }),
    ).rejects.toMatchObject({
      details: { code: "ORDER_FULFILLMENT_UNDEFINED" },
    });
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      version: saved.version,
      paid: false,
      fulfilled: false,
      fulfillmentMode: null,
    });
  });

  it("cadastra evento sem produtos e acrescenta catálogo na edição com histórico preservado", async () => {
    const box = await h.box();
    const input = { ...eventInput(box.id), products: [] };
    const saved = await new CreateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      input,
    );
    expect((await h.events.find(saved.id))?.products).toEqual([]);
    const products = eventInput(box.id).products;
    const updated = await new UpdateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      saved.id,
      saved.version,
      { ...input, requestId: uuid(), products },
    );
    expect((await h.events.find(saved.id))?.products).toHaveLength(1);
    expect(updated.realCents).toBe(0);
    const history = await h.events.history(saved.id, 1, 15);
    expect(history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          before: expect.objectContaining({ products: [] }),
          after: expect.objectContaining({
            products: expect.arrayContaining([
              expect.objectContaining({ name: products[0].name }),
            ]),
          }),
        }),
      ]),
    );
  });

  it("cria, conclui e desfaz entrega sem alterar pagamento, saldos e itens; preserva histórico", async () => {
    const { box, event, order } = await setup();
    const input = {
      ...order,
      fulfillmentMode: "delivery",
      address,
      contactPhone: "(11) 99999-9999",
    };
    const create = new CreateOrderUseCase(h.events);
    const saved = await create.execute(h.actor, event.id, input);
    expect(await create.execute(h.actor, event.id, input)).toMatchObject(saved);
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      fulfillmentMode: "delivery",
      address,
      contactPhone: "11999999999",
      fulfilled: false,
    });
    const update = new UpdateOrderUseCase(h.events);
    const done = await update.execute(
      h.actor,
      event.id,
      saved.id,
      saved.version,
      { ...input, requestId: uuid(), fulfilled: true },
    );
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      fulfilled: true,
      paid: false,
      totalCents: 1000,
    });
    await expect(
      update.execute(h.actor, event.id, saved.id, saved.version, {
        ...input,
        requestId: uuid(),
        fulfilled: false,
      }),
    ).rejects.toMatchObject({ details: { code: "EVENT_CHANGED" } });
    await update.execute(h.actor, event.id, done.id, done.version, {
      ...input,
      requestId: uuid(),
      fulfilled: false,
    });
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      fulfilled: false,
    });
    expect(await h.boxes.find(box.id)).toMatchObject({
      balanceCents: 0,
      pendingCents: 1000,
    });
    const history = await h.events.history(event.id, 1, 15);
    expect(history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorName: h.actor.user.name,
          before: expect.objectContaining({ fulfilled: false }),
          after: expect.objectContaining({ fulfilled: true, address }),
        }),
      ]),
    );
    expect(await h.events.find(event.id)).toMatchObject({
      soldUnits: 1,
      realCents: 0,
      pendingCents: 1000,
    });
  });
  it("aceita entrega sem endereço e retirada concluída com contato opcional", async () => {
    const { event, order } = await setup();
    for (const mode of ["delivery", "pickup"]) {
      const saved = await new CreateOrderUseCase(h.events).execute(
        h.actor,
        event.id,
        { ...order, requestId: uuid(), fulfillmentMode: mode, fulfilled: true },
      );
      expect(await h.events.findOrder(saved.id)).toMatchObject({
        fulfilled: true,
        address: null,
        contactPhone: "",
      });
    }
  });
  it("recusa modalidade ausente/entrada inválida e acesso indevido sem gravar", async () => {
    const { event, order } = await setup();
    const create = new CreateOrderUseCase(h.events);
    for (const input of [
      order,
      {
        ...order,
        fulfillmentMode: "delivery",
        address: { ...emptyOrderAddress, city: "Parcial" },
      },
    ])
      await expect(
        create.execute(h.actor, event.id, input),
      ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
    await expect(
      create.execute(null, event.id, { ...order, fulfillmentMode: "delivery" }),
    ).rejects.toMatchObject({ details: { code: "SESSION_EXPIRED" } });
    expect((await h.events.listOrders(event.id, "", 1, 15)).total).toBe(0);
  });
  it("mantém pedidos antigos indefinidos ao habilitar e permite definir na edição", async () => {
    const { event, input, order } = await setup(false);
    const saved = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      order,
    );
    // Simulate a payload written before delivery fields existed; audit versions remain intact.
    await h.d1
      .prepare(
        "UPDATE event_orders SET version=version+1, payload_json=json_remove(payload_json,'$.fulfillmentMode','$.address','$.contactPhone','$.fulfilled') WHERE id=?",
      )
      .bind(saved.id)
      .run();
    const legacy = await h.events.findOrder(saved.id);
    expect(legacy).toMatchObject({
      fulfillmentMode: null,
      address: null,
      contactPhone: "",
      fulfilled: false,
    });
    const enabled = await new UpdateEventUseCase(h.events, h.boxes).execute(
      h.actor,
      event.id,
      event.version,
      { ...input, requestId: uuid(), deliveryEnabled: true },
    );
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      fulfillmentMode: null,
    });
    await new UpdateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      saved.id,
      legacy!.version,
      {
        ...order,
        catalogVersion: enabled.version,
        requestId: uuid(),
        fulfillmentMode: "pickup",
      },
    );
    expect(await h.events.findOrder(saved.id)).toMatchObject({
      fulfillmentMode: "pickup",
    });
  });
  it("bloqueia desativação mesmo com pedido excluído", async () => {
    const { event, input, order } = await setup();
    const saved = await new CreateOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      { ...order, fulfillmentMode: "pickup" },
    );
    const before = await h.events.history(event.id, 1, 15);
    await expect(
      new UpdateEventUseCase(h.events, h.boxes).execute(
        h.actor,
        event.id,
        event.version,
        { ...input, requestId: uuid(), deliveryEnabled: false },
      ),
    ).rejects.toMatchObject({ details: { code: "EVENT_DELIVERY_LOCKED" } });
    expect(
      await h.events.update(
        { ...event, deliveryEnabled: false, version: event.version + 1 },
        event.version,
      ),
    ).toBe("delivery_locked");
    expect((await h.events.history(event.id, 1, 15)).total).toBe(before.total);
    await new DeleteOrderUseCase(h.events).execute(
      h.actor,
      event.id,
      saved.id,
      saved.version,
    );
    await expect(
      new UpdateEventUseCase(h.events, h.boxes).execute(
        h.actor,
        event.id,
        event.version,
        { ...input, requestId: uuid(), deliveryEnabled: false },
      ),
    ).rejects.toMatchObject({ details: { code: "EVENT_DELIVERY_LOCKED" } });
  });
  it("evento comum rejeita dados de entrega e pode ser habilitado/desabilitado sem pedidos definidos", async () => {
    const { event, input, order } = await setup(false);
    await expect(
      new CreateOrderUseCase(h.events).execute(h.actor, event.id, {
        ...order,
        fulfillmentMode: "delivery",
      }),
    ).rejects.toMatchObject({ details: { code: "EVENT_DELIVERY_DISABLED" } });
    const update = new UpdateEventUseCase(h.events, h.boxes);
    const enabled = await update.execute(h.actor, event.id, event.version, {
      ...input,
      requestId: uuid(),
      deliveryEnabled: true,
    });
    const disabled = await update.execute(h.actor, event.id, enabled.version, {
      ...input,
      requestId: uuid(),
      deliveryEnabled: false,
    });
    expect(disabled.deliveryEnabled).toBe(false);
    expect(
      await h.events.createOrder(
        {
          ...order,
          id: uuid(),
          eventId: event.id,
          customerName: "Teste",
          fulfillmentMode: "delivery",
          address: null,
          contactPhone: "",
          fulfilled: false,
          note: "",
          items: [{ ...event.products[0], quantity: 1 }],
          totalCents: 1000,
          paid: false,
          cashCents: 0,
          pixCents: 0,
          version: 1,
          createdAt: disabled.updatedAt,
          createdBy: 1,
          createdByName: "Teste",
          updatedAt: disabled.updatedAt,
          updatedBy: 1,
          updatedByName: "Teste",
          lastOperation: uuid(),
          fingerprint: "teste",
        },
        disabled.version,
      ),
    ).toBe("delivery_disabled");
  });
});
