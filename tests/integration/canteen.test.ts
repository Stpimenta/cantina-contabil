import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { uuid, eventInput } from "../support/data";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "@/server/events/use-cases/update-order.use-case";
import { DeleteOrderUseCase } from "@/server/events/use-cases/delete-order.use-case";
import { D1CanteenRepository } from "@/server/canteen/infrastructure/d1-canteen.repository";
import { ResolveCommandAuthorization } from "@/server/canteen/infrastructure/command-authorization";
import { credentialCodec } from "@/server/canteen/infrastructure/credential-codec";
import { CreateAccessUseCase } from "@/server/canteen/use-cases/create-access.use-case";
import { ActivateAccessUseCase } from "@/server/canteen/use-cases/activate-access.use-case";
import { CollectCommandUseCase } from "@/server/canteen/use-cases/collect-command.use-case";
import { GetCommandUseCase } from "@/server/canteen/use-cases/get-command.use-case";
import { ListCommandsUseCase } from "@/server/canteen/use-cases/list-commands.use-case";
import { RevokeAccessUseCase } from "@/server/canteen/use-cases/revoke-access.use-case";
import type { Event } from "@/server/events/models/event.model";
let h: Harness;
beforeEach(async () => {
  h = await harness(true);
});
afterEach(async () => {
  await h?.close();
});
async function setup() {
  const box = await h.box();
  const input = { ...eventInput(box.id), canteenEnabled: true };
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    input,
  );
  const repo = new D1CanteenRepository(h.db),
    auth = new ResolveCommandAuthorization(repo, credentialCodec);
  return {
    event,
    input,
    repo,
    auth,
    createAccess: new CreateAccessUseCase(repo, h.events, credentialCodec),
    activate: new ActivateAccessUseCase(repo, credentialCodec),
    collect: new CollectCommandUseCase(h.events, auth),
    list: new ListCommandsUseCase(h.events, repo, auth),
    get: new GetCommandUseCase(h.events, auth),
  };
}
const identity = () => ({ kind: "user" as const, session: h.actor });
const orderData = (event: Event, name = "Pessoa", requestId = uuid()) => ({
  requestId,
  catalogVersion: event.version,
  customerName: name,
  note: "Observação sintética",
  items: [{ productId: event.products[0].id, quantity: 2 }],
  total: "20",
  paid: false,
  cash: "0",
  pix: "0",
});
const createOrder = (event: Event, name = "Pessoa") =>
  new CreateOrderUseCase(h.events).execute(
    h.actor,
    event.id,
    orderData(event, name),
  );
async function access(s: Awaited<ReturnType<typeof setup>>) {
  const issued = await s.createAccess.execute(h.actor, s.event.id, {
    requestId: uuid(),
    name: "Caixa 2",
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
  });
  const active = await s.activate.execute(issued.secret);
  return {
    ...issued,
    ...active,
    identity: { kind: "access" as const, credential: active.credential },
  };
}
describe("Cantina, acesso temporário e entrega durável", () => {
  it("retira e desfaz sem mudar pagamento, saldo ou produtos; preserva autoria separada", async () => {
    const s = await setup(),
      order = await createOrder(s.event),
      a = await access(s);
    const input = {
      requestId: uuid(),
      version: order.version,
      collected: true,
    };
    const saved = await s.collect.execute(
      a.identity,
      s.event.id,
      order.id,
      input,
    );
    expect(
      await s.collect.execute(a.identity, s.event.id, order.id, input),
    ).toEqual(saved);
    const read = await h.events.findOrder(order.id);
    expect(read).toMatchObject({
      paid: false,
      totalCents: 2000,
      cashCents: 0,
      pixCents: 0,
      collected: true,
      version: 2,
      updatedBy: 0,
      updatedByName: `Caixa 2 — acesso criado por ${h.actor.user.name}`,
    });
    expect(read?.items).toEqual(order.items);
    expect(await h.events.find(s.event.id)).toMatchObject({
      realCents: 0,
      pendingCents: 2000,
    });
    const audit = await h.d1
      .prepare(
        "SELECT actor_id,actor_access_id,access_creator_id,access_creator_name FROM event_audit WHERE resource_id=? AND action='update'",
      )
      .bind(order.id)
      .first();
    expect(audit).toMatchObject({
      actor_id: 0,
      actor_access_id: a.access.id,
      access_creator_id: 1,
      access_creator_name: h.actor.user.name,
    });
    await s.collect.execute(a.identity, s.event.id, order.id, {
      requestId: uuid(),
      version: 2,
      collected: false,
    });
    expect(await s.get.execute(a.identity, s.event.id, order.id)).toMatchObject(
      { collected: false, paid: false, version: 3 },
    );
  });
  it("duas ativações simultâneas permitem um navegador e o original pode repetir", async () => {
    const s = await setup(),
      issued = await s.createAccess.execute(h.actor, s.event.id, {
        requestId: uuid(),
        name: "Balcão",
        expiresAt: Math.floor(Date.now() / 1000) + 7200,
      });
    const results = await Promise.allSettled([
      s.activate.execute(issued.secret),
      s.activate.execute(issued.secret),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const success = results.find((r) => r.status === "fulfilled");
    if (success?.status !== "fulfilled") throw new Error("missing winner");
    expect(
      await s.activate.execute(issued.secret, success.value.credential),
    ).toEqual(success.value);
    await expect(s.activate.execute(issued.secret)).rejects.toMatchObject({
      details: { code: "TEMP_ACCESS_USED" },
    });
    const stored = await h.d1
      .prepare("SELECT link_hash,session_hash FROM canteen_access")
      .first();
    expect(stored?.link_hash).not.toBe(issued.secret);
    expect(stored?.session_hash).not.toBe(success.value.credential);
  });
  it("rejeita escopo, revogação e expiração em toda operação sem efeitos", async () => {
    const s = await setup(),
      order = await createOrder(s.event),
      a = await access(s);
    await expect(
      s.get.execute(a.identity, uuid(), order.id),
    ).rejects.toMatchObject({ details: { code: "TEMP_ACCESS_ENDED" } });
    await new RevokeAccessUseCase(s.repo, h.publications!, h.events).execute(
      h.actor,
      s.event.id,
      a.access.id,
      uuid(),
    );
    await expect(
      s.collect.execute(a.identity, s.event.id, order.id, {
        requestId: uuid(),
        version: 1,
        collected: true,
      }),
    ).rejects.toMatchObject({ details: { code: "TEMP_ACCESS_ENDED" } });
    await expect(
      s.list.execute(a.identity, s.event.id, {
        q: "",
        page: 1,
        collected: "waiting",
      }),
    ).rejects.toMatchObject({ details: { code: "TEMP_ACCESS_ENDED" } });
    expect(await h.events.findOrder(order.id)).toMatchObject({
      version: 1,
      collected: false,
    });
    const b = await access(s);
    await h.d1
      .prepare("UPDATE canteen_access SET expires_at=unixepoch()-1 WHERE id=?")
      .bind(b.access.id)
      .run();
    await expect(
      s.get.execute(b.identity, s.event.id, order.id),
    ).rejects.toMatchObject({ details: { code: "TEMP_ACCESS_ENDED" } });
  });
  it("bloqueia entrada/saída de Cantina com pedidos preservados, inclusive excluídos", async () => {
    const s = await setup(),
      order = await createOrder(s.event);
    await expect(
      new UpdateEventUseCase(h.events, h.boxes).execute(
        h.actor,
        s.event.id,
        s.event.version,
        { ...s.input, requestId: uuid(), canteenEnabled: false },
      ),
    ).rejects.toMatchObject({ details: { code: "EVENT_MODALITY_LOCKED" } });
    await new DeleteOrderUseCase(h.events).execute(
      h.actor,
      s.event.id,
      order.id,
      order.version,
    );
    await expect(
      new UpdateEventUseCase(h.events, h.boxes).execute(
        h.actor,
        s.event.id,
        s.event.version,
        { ...s.input, requestId: uuid(), canteenEnabled: false },
      ),
    ).rejects.toMatchObject({ details: { code: "EVENT_MODALITY_LOCKED" } });
  });
  it("filtra e pagina 15 pelo nome/retirada, mais antigos primeiro, sem depender do pagamento", async () => {
    const s = await setup();
    for (let i = 0; i < 17; i++) {
      await createOrder(s.event, `Pessoa ${String(i).padStart(2, "0")}`);
    }
    const page = await s.list.execute(identity(), s.event.id, {
      q: "Pessoa",
      page: 1,
      collected: "waiting",
    });
    expect(page.items).toHaveLength(15);
    expect(page.total).toBe(17);
    expect(page.items[0].customerName).toBe("Pessoa 00");
    const o = page.items[0];
    await s.collect.execute(identity(), s.event.id, o.id, {
      requestId: uuid(),
      version: o.version,
      collected: true,
    });
    expect(
      (
        await s.list.execute(identity(), s.event.id, {
          q: "Pessoa",
          page: 1,
          collected: "waiting",
        })
      ).items,
    ).toHaveLength(15);
    expect(
      (
        await s.list.execute(identity(), s.event.id, {
          q: "Pessoa 00",
          page: 1,
          collected: "collected",
        })
      ).total,
    ).toBe(1);
  });
  it("sem filtro inclui todos, prioriza não retirados antes da paginação e reordena ao desfazer", async () => {
    const s = await setup();
    for (let i = 0; i < 17; i++)
      await createOrder(s.event, `Pessoa ${String(i).padStart(2, "0")}`);
    const before = await s.list.execute(identity(), s.event.id, {});
    expect(before.collected).toBe("all");
    expect(before.total).toBe(17);
    const first = before.items[0];
    const updated = await s.collect.execute(identity(), s.event.id, first.id, {
      requestId: uuid(),
      version: first.version,
      collected: true,
    });
    const page1 = await s.list.execute(identity(), s.event.id, {});
    expect(page1.total).toBe(17);
    expect(page1.items).toHaveLength(15);
    expect(page1.items.every((item) => !item.collected)).toBe(true);
    expect(page1.items[0].customerName).toBe("Pessoa 01");
    const page2 = await s.list.execute(identity(), s.event.id, { page: 2 });
    expect(
      page2.items.map((item) => [item.customerName, item.collected]),
    ).toEqual([
      ["Pessoa 16", false],
      ["Pessoa 00", true],
    ]);
    const searched = await s.list.execute(identity(), s.event.id, {
      q: "Pessoa 00",
    });
    expect(searched.total).toBe(1);
    expect(searched.items[0].collected).toBe(true);
    await s.collect.execute(identity(), s.event.id, first.id, {
      requestId: uuid(),
      version: updated.version,
      collected: false,
    });
    expect(
      (await s.list.execute(identity(), s.event.id, {})).items[0],
    ).toMatchObject({ id: first.id, collected: false });
  });
  it("apenas uma retirada concorrente vence e operação velha não altera versão", async () => {
    const s = await setup(),
      o = await createOrder(s.event);
    const results = await Promise.allSettled([
      s.collect.execute(identity(), s.event.id, o.id, {
        requestId: uuid(),
        version: 1,
        collected: true,
      }),
      s.collect.execute(identity(), s.event.id, o.id, {
        requestId: uuid(),
        version: 1,
        collected: true,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await h.events.findOrder(o.id)).toMatchObject({
      version: 2,
      collected: true,
    });
  });
  it("alarme publica com tablet conectado sem flush/reconexão após hibernação e encerra na revogação", async () => {
    const s = await setup(),
      a = await access(s);
    const actor = await s.auth.resolve(a.identity, s.event.id);
    const hub = h.hubs!.get(h.hubs!.idFromName(s.event.id));
    const response = await hub.fetch("https://commands.internal/socket", {
      headers: {
        Upgrade: "websocket",
        "x-command-event": s.event.id,
        "x-command-actor": JSON.stringify(actor),
      },
    });
    const socket = response.webSocket!;
    socket.accept();
    const messages: unknown[] = [];
    socket.addEventListener("message", (e) =>
      messages.push(JSON.parse(String(e.data))),
    );
    await h.mf.unsafeEvictDurableObject("cantina-tests", "CommandHub", {
      name: s.event.id,
      webSockets: "hibernate",
    });
    const order = await createOrder(s.event);
    await expect
      .poll(() => messages, { timeout: 6000 })
      .toContainEqual({ type: "order", id: order.id, version: 1 });
    await new RevokeAccessUseCase(s.repo, h.publications!, h.events).execute(
      h.actor,
      s.event.id,
      a.access.id,
      uuid(),
    );
    await expect
      .poll(() => messages, { timeout: 6000 })
      .toContainEqual({ type: "session-ended" });
    socket.close();
  });
  it("intenção vencida é cercada no banco e não permite gravação tardia", async () => {
    const s = await setup(),
      operation = uuid();
    await h.publications!.arm(s.event.id, operation);
    await h.d1
      .prepare(
        "UPDATE canteen_publications SET deadline=unixepoch()-1 WHERE id=?",
      )
      .bind(operation)
      .run();
    await expect(
      new CreateOrderUseCase(h.events).execute(
        h.actor,
        s.event.id,
        orderData(s.event, "Tardio", operation),
      ),
    ).rejects.toMatchObject({ details: { code: "EVENT_CHANGED" } });
    await h.publications!.flush(s.event.id);
    expect(
      await h.d1
        .prepare("SELECT state FROM canteen_publications WHERE id=?")
        .bind(operation)
        .first(),
    ).toMatchObject({ state: "cancelled" });
    expect((await h.events.listOrders(s.event.id, "", 1, 15)).total).toBe(0);
  });
  it("handshake externo confere cookie/Origin/escopo e expiração fecha socket sozinho", async () => {
    const s = await setup(),
      issued = await s.createAccess.execute(h.actor, s.event.id, {
        requestId: uuid(),
        name: "Curto",
        expiresAt: Math.floor(Date.now() / 1000) + 3,
      }),
      a = await s.activate.execute(issued.secret);
    const url = `https://app.test/api/events/${s.event.id}/commands/socket`;
    const missing = await h.mf.dispatchFetch(url, {
      headers: { Upgrade: "websocket", Origin: "https://app.test" },
    });
    expect(missing.status).toBe(401);
    const wrong = await h.mf.dispatchFetch(url, {
      headers: {
        Upgrade: "websocket",
        Origin: "https://other.test",
        Cookie: `cantina-command-access=${a.credential}`,
      },
    });
    expect(wrong.status).toBe(403);
    const response = await h.mf.dispatchFetch(url, {
      headers: {
        Upgrade: "websocket",
        Origin: "https://app.test",
        Cookie: `cantina-command-access=${a.credential}`,
      },
    });
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    socket.accept();
    const messages: unknown[] = [];
    socket.addEventListener("message", (e) =>
      messages.push(JSON.parse(String(e.data))),
    );
    await expect
      .poll(() => messages, { timeout: 6000 })
      .toContainEqual({ type: "session-ended" });
    socket.close();
  });
  it("edição e exclusão geram avisos versionados e preservam a retirada anterior", async () => {
    const s = await setup(),
      o = await createOrder(s.event);
    await s.collect.execute(identity(), s.event.id, o.id, {
      requestId: uuid(),
      version: 1,
      collected: true,
    });
    const edited = await new UpdateOrderUseCase(h.events).execute(
      h.actor,
      s.event.id,
      o.id,
      2,
      { ...orderData(s.event, "Nome corrigido"), note: "Outra observação" },
    );
    expect(edited).toMatchObject({ collected: true, version: 3 });
    await new DeleteOrderUseCase(h.events).execute(
      h.actor,
      s.event.id,
      o.id,
      3,
    );
    expect(await s.get.execute(identity(), s.event.id, o.id)).toBeNull();
    const notices = await h.d1
      .prepare(
        "SELECT version FROM canteen_publications WHERE order_id=? ORDER BY version",
      )
      .bind(o.id)
      .all();
    expect(notices.results.map((r) => r.version)).toEqual([1, 2, 3, 4]);
  });
});
