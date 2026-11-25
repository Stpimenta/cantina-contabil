import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, uuid } from "../support/data";
import { replenishEvent, clearEventEntries } from "../support/event-stock";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { D1DeliveryRepository } from "@/server/deliveries/infrastructure/d1-delivery.repository";
import { SaveDriverUseCase } from "@/server/deliveries/use-cases/save-driver.use-case";
import { SaveDeliverySettingsUseCase } from "@/server/deliveries/use-cases/save-delivery-settings.use-case";
import { SaveRouteUseCase } from "@/server/deliveries/use-cases/save-route.use-case";
import { MoveDeliveryUseCase } from "@/server/deliveries/use-cases/move-delivery.use-case";
import { DeliverOrderUseCase } from "@/server/deliveries/use-cases/deliver-order.use-case";
import { CreateDeliveryAccessUseCase } from "@/server/deliveries/use-cases/create-delivery-access.use-case";
import { ResolveDeliveryAccessUseCase } from "@/server/deliveries/use-cases/resolve-delivery-access.use-case";
import { ListDriverDeliveriesUseCase } from "@/server/deliveries/use-cases/list-driver-deliveries.use-case";
import { ActivateAccessUseCase } from "@/server/canteen/use-cases/activate-access.use-case";
import { credentialCodec } from "@/server/canteen/infrastructure/credential-codec";
import { emptyOrderAddress } from "@/server/events/inputs/order-delivery.input";
let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
const origin = {
  ...emptyOrderAddress,
  street: "Rua Sintética",
  number: "1",
  neighborhood: "Centro",
  city: "Cidade",
  state: "SP",
};
async function setup() {
  const box = await h.box(),
    event = await new CreateEventUseCase(h.events, h.boxes).execute(h.actor, {
      ...eventInput(box.id),
      deliveryEnabled: true,
    });
  await replenishEvent(h, event);
  const repo = new D1DeliveryRepository(h.db),
    driver = await new SaveDriverUseCase(repo, h.events).execute(
      h.actor,
      event.id,
      {
        id: uuid(),
        requestId: uuid(),
        version: 0,
        name: "Entregador sintético",
        phone: "",
      },
    );
  await new SaveDeliverySettingsUseCase(repo, h.events).execute(
    h.actor,
    event.id,
    { requestId: uuid(), version: 0, origin, driverIds: [driver.id] },
  );
  const orders = [];
  for (let index = 0; index < 3; index++)
    orders.push(
      await new CreateOrderUseCase(h.events).execute(h.actor, event.id, {
        requestId: uuid(),
        catalogVersion: event.version,
        customerName: `Pessoa ${index}`,
        note: "",
        items: [{ productId: event.products[0]!.id, quantity: 1 }],
        total: "10",
        paid: false,
        cash: "0",
        pix: "0",
        fulfillmentMode: "delivery",
        ...(index === 0 ? {} : { address: origin }),
        contactPhone: "",
      }),
    );
  const save = new SaveRouteUseCase(repo, h.events),
    auth = new ResolveDeliveryAccessUseCase(repo, h.events, credentialCodec);
  const route = (orderIds: string[], driverId = driver.id) =>
    save.execute(h.actor, event.id, {
      id: uuid(),
      requestId: uuid(),
      version: 0,
      name: "Viagem",
      driverId,
      orderIds,
    });
  return {
    box,
    event,
    repo,
    driver,
    orders,
    save,
    auth,
    route,
    deliver: new DeliverOrderUseCase(repo, h.events, auth),
  };
}
async function access(s: Awaited<ReturnType<typeof setup>>) {
  const issued = await new CreateDeliveryAccessUseCase(
    s.repo,
    h.events,
    credentialCodec,
  ).execute(h.actor, s.event.id, {
    requestId: uuid(),
    driverId: s.driver.id,
    name: s.driver.name,
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
  });
  const activated = await new ActivateAccessUseCase(
    s.repo,
    credentialCodec,
  ).execute(issued.secret);
  return { ...activated, secret: issued.secret };
}
describe("rotas de entrega", () => {
  it("aceita pedido sem endereço, bloqueia duplicidade e permite várias viagens do mesmo entregador", async () => {
    const s = await setup(),
      first = await s.route([s.orders[0]!.id, s.orders[1]!.id]);
    await s.route([s.orders[2]!.id]);
    await expect(s.route([s.orders[0]!.id])).rejects.toMatchObject({
      details: { code: "DELIVERY_ORDER_ASSIGNED" },
    });
    expect((await s.repo.routes(s.event.id, 1)).total).toBe(2);
    expect((await s.repo.orders(s.event.id, first.id))[0]!.address).toBeNull();
    expect((await s.repo.candidates(s.event.id, "", 1)).total).toBe(0);
  });
  it("move em transação e preserva origem e destino quando a versão de destino está desatualizada", async () => {
    const s = await setup(),
      from = await s.route([s.orders[0]!.id, s.orders[1]!.id]),
      to = await s.route([s.orders[2]!.id]);
    const changed = await s.save.execute(h.actor, s.event.id, {
      ...to,
      requestId: uuid(),
      name: "Destino alterado",
    });
    const remove = {
      ...from,
      orderIds: [s.orders[1]!.id],
      version: from.version + 1,
      lastOperation: uuid(),
    };
    const append = {
      ...to,
      orderIds: [...to.orderIds, s.orders[0]!.id],
      version: to.version + 1,
      lastOperation: uuid(),
    };
    await expect(
      s.repo.saveRoutes([
        { value: remove, expected: from.version },
        { value: append, expected: to.version },
      ]),
    ).rejects.toMatchObject({ details: { code: "DELIVERY_CHANGED" } });
    expect((await s.repo.route(from.id))!.orderIds).toEqual(from.orderIds);
    await new MoveDeliveryUseCase(s.repo, h.events).execute(
      h.actor,
      s.event.id,
      {
        requestId: uuid(),
        fromId: from.id,
        fromVersion: from.version,
        toId: to.id,
        toVersion: changed.version,
        orderId: s.orders[0]!.id,
      },
    );
    expect((await s.repo.route(from.id))!.orderIds).toEqual([s.orders[1]!.id]);
    expect((await s.repo.route(to.id))!.orderIds).toEqual([
      ...to.orderIds,
      s.orders[0]!.id,
    ]);
  });
  it("entrega/desfaz com autoria do acesso, baixa física única e sem alterar dinheiro", async () => {
    const s = await setup(),
      route = await s.route([s.orders[0]!.id]),
      a = await access(s);
    const before = await h.events.find(s.event.id),
      ordersBefore = await s.repo.orders(s.event.id, route.id),
      stockBefore = await h.events.orderStockBalances(s.event.id);
    const identity = { kind: "temporary" as const, credential: a.credential },
      input = {
        requestId: uuid(),
        routeId: route.id,
        version: ordersBefore[0]!.version,
        fulfilled: true,
      };
    await s.deliver.execute(identity, s.event.id, s.orders[0]!.id, input);
    await s.deliver.execute(identity, s.event.id, s.orders[0]!.id, input);
    const saved = (await h.events.findOrder(s.orders[0]!.id))!;
    expect(saved).toMatchObject({
      fulfilled: true,
      version: input.version + 1,
      paid: false,
      totalCents: 1000,
      updatedBy: 0,
      updatedActor: {
        kind: "delivery",
        id: a.access.id,
        createdBy: h.actor.user.id,
      },
    });
    expect(await h.events.orderStockBalances(s.event.id)).toEqual(
      stockBefore.map((b) => ({ ...b, quantity: b.quantity - 1 })),
    );
    expect(await h.events.find(s.event.id)).toMatchObject({
      realCents: before!.realCents,
      pendingCents: before!.pendingCents,
      soldUnits: before!.soldUnits,
    });
    await s.deliver.execute(identity, s.event.id, saved.id, {
      ...input,
      requestId: uuid(),
      version: saved.version,
      fulfilled: false,
    });
    expect((await s.repo.orders(s.event.id, route.id))[0]!.fulfilled).toBe(
      false,
    );
    expect(await h.events.orderStockBalances(s.event.id)).toEqual(stockBefore);
  });
  it("limita o acesso ao entregador e ao evento e recusa revogação/expiração", async () => {
    const s = await setup(),
      route = await s.route([s.orders[0]!.id]),
      a = await access(s),
      list = new ListDriverDeliveriesUseCase(s.repo, h.events, s.auth);
    const board = await list.execute(a.credential, s.event.id, {});
    expect(board.routes.items.map((r) => r.id)).toEqual([route.id]);
    expect(board.routes.items[0]!.orders[0]).not.toHaveProperty("paid");
    expect(board.routes.items[0]!.orders[0]).not.toHaveProperty("totalCents");
    await expect(list.execute(a.credential, uuid(), {})).rejects.toMatchObject({
      details: { code: "TEMP_ACCESS_ENDED" },
    });
    const otherDriver = await new SaveDriverUseCase(s.repo, h.events).execute(
      h.actor,
      s.event.id,
      {
        id: uuid(),
        requestId: uuid(),
        version: 0,
        name: "Outro entregador",
        phone: "",
      },
    );
    const settings = (await s.repo.settings(s.event.id))!;
    await new SaveDeliverySettingsUseCase(s.repo, h.events).execute(
      h.actor,
      s.event.id,
      {
        ...settings,
        requestId: uuid(),
        driverIds: [s.driver.id, otherDriver.id],
      },
    );
    await s.save.execute(h.actor, s.event.id, {
      ...route,
      requestId: uuid(),
      driverId: otherDriver.id,
    });
    expect(
      (await list.execute(a.credential, s.event.id, {})).routes.total,
    ).toBe(0);
    await expect(
      s.deliver.execute(
        { kind: "temporary", credential: a.credential },
        s.event.id,
        s.orders[0]!.id,
        {
          requestId: uuid(),
          routeId: route.id,
          version: s.orders[0]!.version,
          fulfilled: true,
        },
      ),
    ).rejects.toMatchObject({ details: { code: "DELIVERY_CHANGED" } });
    await s.repo.revoke(a.access.id, s.event.id);
    await expect(
      s.deliver.execute(
        { kind: "temporary", credential: a.credential },
        s.event.id,
        s.orders[0]!.id,
        {
          requestId: uuid(),
          routeId: route.id,
          version: s.orders[0]!.version,
          fulfilled: true,
        },
      ),
    ).rejects.toMatchObject({ details: { code: "TEMP_ACCESS_ENDED" } });
    const second = await access(s);
    await h.d1
      .prepare("UPDATE delivery_access SET expires_at=unixepoch()-1 WHERE id=?")
      .bind(second.access.id)
      .run();
    await expect(
      list.execute(second.credential, s.event.id, {}),
    ).rejects.toMatchObject({ details: { code: "TEMP_ACCESS_ENDED" } });
  });
  it("permite ativação em um único navegador e mantém a credencial original na repetição", async () => {
    const s = await setup(),
      a = await access(s),
      activate = new ActivateAccessUseCase(s.repo, credentialCodec);
    expect((await activate.execute(a.secret, a.credential)).credential).toBe(
      a.credential,
    );
    await expect(activate.execute(a.secret)).rejects.toMatchObject({
      details: { code: "TEMP_ACCESS_USED" },
    });
  });
  it("recusa gestão por consulta e entregador não selecionado no evento", async () => {
    const s = await setup(),
      reader = {
        ...h.actor,
        role: "operator" as const,
        eventIds: [s.event.id],
        eventWriteIds: [],
      };
    await expect(
      s.save.execute(reader, s.event.id, {
        id: uuid(),
        requestId: uuid(),
        version: 0,
        name: "Rota",
        driverId: s.driver.id,
        orderIds: [s.orders[0]!.id],
      }),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    await expect(s.route([s.orders[0]!.id], uuid())).rejects.toMatchObject({
      details: { code: "DELIVERY_CHANGED" },
    });
  });
});

it("entregador temporário não repõe falta; responsável confirma reposição e entrega", async () => {
  const s = await setup(),
    route = await s.route([s.orders[0]!.id]),
    a = await access(s);
  await clearEventEntries(h, s.event);
  const target = (await h.events.findOrder(s.orders[0]!.id))!;
  const input = {
    requestId: uuid(),
    routeId: route.id,
    version: target.version,
    fulfilled: true,
  };
  const temporary = { kind: "temporary" as const, credential: a.credential };
  await expect(
    s.deliver.execute(temporary, s.event.id, target.id, input),
  ).rejects.toMatchObject({ details: { code: "STOCK_INSUFFICIENT" } });
  const confirmed = {
    ...input,
    stockConfirmation: [
      { productId: s.event.products[0].id, available: 0, missing: 1 },
    ],
  };
  await expect(
    s.deliver.execute(temporary, s.event.id, target.id, confirmed),
  ).rejects.toMatchObject({ details: { code: "INVALID_STOCK_INPUT" } });
  const user = { kind: "user" as const, session: h.actor };
  await s.deliver.execute(user, s.event.id, target.id, confirmed);
  await s.deliver.execute(user, s.event.id, target.id, confirmed);
  expect((await h.events.findOrder(target.id))?.fulfilled).toBe(true);
  expect(await h.events.orderStockBalances(s.event.id)).toContainEqual({
    productId: s.event.products[0].id,
    quantity: 0,
  });
});
