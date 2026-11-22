import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { eventInput, pdf, uuid } from "../support/data";
import { replenishEvent } from "../support/event-stock";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "@/server/events/use-cases/update-order.use-case";
import { UpdateOrderStatusUseCase } from "@/server/events/use-cases/update-order-status.use-case";
import { GetOrderReceiptUseCase } from "@/server/events/use-cases/get-order-receipt.use-case";
import { orderReceiptKey } from "@/server/events/use-cases/order-receipts";
import { RECEIPT_MAX_BYTES } from "@/shared/receipts/receipt-input";

let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
async function setup() {
  const box = await h.box();
  const event = await new CreateEventUseCase(h.events, h.boxes).execute(
    h.actor,
    eventInput(box.id),
  );
  await replenishEvent(h, event);
  const data = {
    requestId: uuid(),
    catalogVersion: event.version,
    customerName: "Pessoa sintética",
    note: "",
    items: [{ productId: event.products[0].id, quantity: 2 }],
    total: "20",
    paid: true,
    cash: "0",
    pix: "20",
  };
  return {
    event,
    data,
    create: new CreateOrderUseCase(h.events, h.receipts),
    update: new UpdateOrderUseCase(h.events, h.receipts),
    read: new GetOrderReceiptUseCase(h.events, h.receipts),
  };
}
describe("comprovantes opcionais de pedidos", () => {
  it("situação do pedido permite anexar/remover sem alterar pagamento e repete sem duplicar", async () => {
    const s = await setup();
    const order = await s.create.execute(h.actor, s.event.id, {
      ...s.data,
      paid: false,
      pix: "0",
    });
    const update = new UpdateOrderStatusUseCase(h.events, h.receipts);
    const file = pdf("pagamento anexado depois");
    const input = { requestId: uuid() };
    const saved = await update.execute(
      h.actor,
      s.event.id,
      order.id,
      order.version,
      input,
      [file],
    );
    expect(saved).toMatchObject({
      paid: false,
      cashCents: 0,
      pixCents: 0,
      version: 2,
    });
    expect(saved.receipts).toHaveLength(1);
    expect(
      await update.execute(
        h.actor,
        s.event.id,
        order.id,
        order.version,
        input,
        [file],
      ),
    ).toEqual(saved);
    const receipt = saved.receipts![0];
    expect(
      (await s.read.execute(h.actor, s.event.id, order.id, receipt.id)).type,
    ).toBe("application/pdf");
    expect(
      (await h.bucket.list({ prefix: `orders/${s.event.id}/${order.id}/` }))
        .objects,
    ).toHaveLength(1);
    const paid = await update.execute(
      h.actor,
      s.event.id,
      order.id,
      saved.version,
      {
        requestId: uuid(),
        payment: { method: "pix", cash: "0" },
        fulfilled: true,
      },
    );
    expect(paid.receipts).toEqual(saved.receipts);
    expect(paid).toMatchObject({ paid: true, pixCents: 2000 });
    const removed = await update.execute(
      h.actor,
      s.event.id,
      order.id,
      paid.version,
      { requestId: uuid(), retainedReceiptIds: [] },
    );
    expect(removed.receipts).toEqual([]);
    expect(removed).toMatchObject({ paid: true, pixCents: 2000 });
    expect(
      await h.receipts.get(orderReceiptKey(s.event.id, order.id, receipt.id)),
    ).not.toBeNull();
    await expect(
      update.execute(h.actor, s.event.id, order.id, removed.version, {
        requestId: uuid(),
        retainedReceiptIds: [uuid()],
      }),
    ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
  });
  it("aceita pedido sem anexo e repete upload sem duplicar objeto, pagamento ou auditoria", async () => {
    const s = await setup();
    const empty = await s.create.execute(h.actor, s.event.id, {
      ...s.data,
      requestId: uuid(),
    });
    expect(empty.receipts).toEqual([]);
    expect((await h.events.findOrder(empty.id))?.receipts).toEqual([]);
    const file = pdf("comprovante sintético");
    const order = await s.create.execute(h.actor, s.event.id, s.data, [file]);
    expect(
      await s.create.execute(h.actor, s.event.id, s.data, [file]),
    ).toMatchObject(order);
    const receipt = order.receipts![0];
    expect(receipt).toMatchObject({ type: "application/pdf", size: file.size });
    expect(receipt).not.toHaveProperty("key");
    expect((await h.events.findOrder(order.id))?.receipts).toEqual(
      order.receipts,
    );
    const read = await s.read.execute(
      h.actor,
      s.event.id,
      order.id,
      receipt.id,
    );
    expect(new Uint8Array(read.body)).toEqual(
      new Uint8Array(await file.arrayBuffer()),
    );
    expect(
      (await h.bucket.list({ prefix: `orders/${s.event.id}/${order.id}/` }))
        .objects,
    ).toHaveLength(1);
    expect(await h.events.find(s.event.id)).toMatchObject({
      realCents: 4000,
      pendingCents: 0,
    });
    const audit = await h.d1
      .prepare(
        "SELECT count(*) AS count FROM event_audit WHERE resource_id=? AND action='create'",
      )
      .bind(order.id)
      .first<{ count: number }>();
    expect(audit?.count).toBe(1);
  });
  it("mantém anexo na edição e retirada, permite remover sem apagar o objeto histórico", async () => {
    const s = await setup();
    const order = await s.create.execute(h.actor, s.event.id, s.data, [
      pdf("original"),
    ]);
    const first = order.receipts![0];
    const data = {
      ...s.data,
      requestId: uuid(),
      retainedReceiptIds: [first.id],
    };
    const edited = await s.update.execute(
      h.actor,
      s.event.id,
      order.id,
      order.version,
      data,
      [pdf("segundo")],
    );
    expect(edited.receipts).toHaveLength(2);
    expect(edited.receipts![0]).toEqual(first);
    const withdrawn = await new UpdateOrderStatusUseCase(h.events).execute(
      h.actor,
      s.event.id,
      order.id,
      edited.version,
      { requestId: uuid(), fulfilled: true },
    );
    expect(withdrawn.receipts).toEqual(edited.receipts);
    const removed = await s.update.execute(
      h.actor,
      s.event.id,
      order.id,
      withdrawn.version,
      { ...s.data, requestId: uuid(), retainedReceiptIds: [] },
    );
    expect(removed.receipts).toEqual([]);
    await expect(
      s.read.execute(h.actor, s.event.id, order.id, first.id),
    ).rejects.toMatchObject({ details: { code: "RECEIPT_NOT_FOUND" } });
    expect(
      await h.receipts.get(orderReceiptKey(s.event.id, order.id, first.id)),
    ).not.toBeNull();
    expect(
      JSON.stringify(await h.events.history(s.event.id, 1, 15)),
    ).not.toContain(`orders/${s.event.id}`);
    expect(await h.events.find(s.event.id)).toMatchObject({
      realCents: 2000,
      pendingCents: 0,
    });
  });
  it("recusa MIME/assinatura, excesso de tamanho/quantidade, anexo de outro pedido e acesso sem permissão", async () => {
    const s = await setup();
    const forged = new File(["não é PDF"], "falso.pdf", {
      type: "application/pdf",
    });
    await expect(
      s.create.execute(h.actor, s.event.id, s.data, [forged]),
    ).rejects.toMatchObject({
      details: {
        code: "INVALID_ORDER_INPUT",
        issues: { receipts: "INVALID_ORDER_RECEIPT" },
      },
    });
    const large = new File(
      [new Uint8Array(RECEIPT_MAX_BYTES + 1)],
      "grande.pdf",
      { type: "application/pdf" },
    );
    await expect(
      s.create.execute(h.actor, s.event.id, s.data, [large]),
    ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
    await expect(
      s.create.execute(
        h.actor,
        s.event.id,
        s.data,
        Array.from({ length: 6 }, () => pdf()),
      ),
    ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
    expect(await h.events.findOrder(s.data.requestId)).toBeNull();
    expect((await h.bucket.list({ prefix: "orders/" })).objects).toHaveLength(
      0,
    );
    const order = await s.create.execute(h.actor, s.event.id, s.data, [pdf()]);
    const receipt = order.receipts![0];
    const other = await s.create.execute(h.actor, s.event.id, {
      ...s.data,
      requestId: uuid(),
    });
    await expect(
      s.read.execute(h.actor, s.event.id, other.id, receipt.id),
    ).rejects.toMatchObject({ details: { code: "RECEIPT_NOT_FOUND" } });
    await expect(
      s.update.execute(h.actor, s.event.id, other.id, other.version, {
        ...s.data,
        requestId: uuid(),
        retainedReceiptIds: [receipt.id],
      }),
    ).rejects.toMatchObject({ details: { code: "INVALID_ORDER_INPUT" } });
    const reader = {
      ...h.actor,
      role: "operator" as const,
      eventIds: [s.event.id],
      eventWriteIds: [],
    };
    expect(
      (await s.read.execute(reader, s.event.id, order.id, receipt.id)).type,
    ).toBe("application/pdf");
    await expect(
      s.update.execute(reader, s.event.id, order.id, order.version, {
        ...s.data,
        requestId: uuid(),
        retainedReceiptIds: [],
      }),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    await expect(
      s.read.execute(
        { ...reader, eventIds: [] },
        s.event.id,
        order.id,
        receipt.id,
      ),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    await expect(
      s.read.execute(null, s.event.id, order.id, receipt.id),
    ).rejects.toThrow();
  });
});
