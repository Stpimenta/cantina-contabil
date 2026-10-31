import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { harness, type Harness } from "../support/harness";
import { donationInput, eventInput, movementInput, pdf, supplyInput, uuid } from "../support/data";
import { CreateDonationUseCase } from "@/server/donations/use-cases/create-donation.use-case";
import { UpdateDonationUseCase } from "@/server/donations/use-cases/update-donation.use-case";
import { DeleteDonationUseCase } from "@/server/donations/use-cases/delete-donation.use-case";
import { CreateMovementUseCase } from "@/server/movements/use-cases/create-movement.use-case";
import { UpdateMovementUseCase } from "@/server/movements/use-cases/update-movement.use-case";
import { DeleteMovementUseCase } from "@/server/movements/use-cases/delete-movement.use-case";
import { CreateEventUseCase } from "@/server/events/use-cases/create-event.use-case";
import { CreateOrderUseCase } from "@/server/events/use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "@/server/events/use-cases/update-order.use-case";
import { DeleteOrderUseCase } from "@/server/events/use-cases/delete-order.use-case";
import { UpdateEventUseCase } from "@/server/events/use-cases/update-event.use-case";
import { CreateSupplyUseCase } from "@/server/events/use-cases/create-supply.use-case";
import { UpdateSupplyUseCase } from "@/server/events/use-cases/update-supply.use-case";
import { DeleteSupplyUseCase } from "@/server/events/use-cases/delete-supply.use-case";
import { ReceiveSupplyUseCase } from "@/server/events/use-cases/receive-supply.use-case";
import { DeleteEventUseCase } from "@/server/events/use-cases/delete-event.use-case";
import { DeleteCashBoxUseCase } from "@/server/cash-boxes/use-cases/delete-cash-box.use-case";
import { CreateCashBoxUseCase } from "@/server/cash-boxes/use-cases/create-cash-box.use-case";
import { GetHomeUseCase } from "@/server/home/use-cases/get-home.use-case";

let h: Harness;
beforeEach(async () => { h = await harness(); });
afterEach(async () => { await h?.close(); });
const donate = (box: string, amount = "100", id = uuid()) => new CreateDonationUseCase(h.donations, h.boxes).execute(h.actor, id, donationInput(box, amount));
const move = (box: string, amount = "20", direction: "incoming" | "outgoing" = "incoming") => new CreateMovementUseCase(h.movements, h.boxes, h.receipts).execute(h.actor, movementInput(box, amount, direction));
const event = (box: string) => new CreateEventUseCase(h.events, h.boxes).execute(h.actor, eventInput(box));
const orderInput = (productId: string, total = "30", paid = true, catalogVersion = 1) => ({ requestId: uuid(), catalogVersion, customerName: "Pessoa", note: "", items: [{ productId, quantity: 2 }], total, paid, cash: "0", pix: paid ? total : "0" });
const supply = (eventId: string, box: string | null, amount = "25") => new CreateSupplyUseCase(h.supplies, h.events, h.boxes, h.receipts).execute(h.actor, eventId, supplyInput(box, amount), box ? [pdf()] : []);
const balance = async (box: string, real: number, pending = 0) => expect(await h.boxes.find(box)).toMatchObject({ balanceCents: real, pendingCents: pending });
const state = async () => {
  // Assert every persisted column and audit row, not just the reported balance.
  const tables = ["cash_boxes", "cash_box_audit", "donations", "donation_audit", "cash_movements", "cash_movement_audit", "events", "event_orders", "event_supplies", "event_audit", "event_supply_audit", "event_products", "event_order_items", "event_order_payments"];
  const result: Record<string, unknown> = {};
  for (const table of tables) result[table] = (await h.d1.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;
  return result;
};
async function unchanged(operation: () => Promise<unknown>, code: string) {
  const before = await state();
  await expect(operation()).rejects.toMatchObject({ details: { code } });
  expect(await state()).toEqual(before);
}

describe("saldos financeiros", () => {
  it("combina origens sem dupla contagem e separa pendente", async () => {
    const box = await h.box(); const e = await event(box.id);
    await donate(box.id);
    await new CreateOrderUseCase(h.events).execute(h.actor, e.id, orderInput(e.products[0].id));
    await new CreateOrderUseCase(h.events).execute(h.actor, e.id, orderInput(e.products[0].id, "40", false));
    await move(box.id); await supply(e.id, box.id); await move(box.id, "10", "outgoing"); await supply(e.id, null, "500");
    await balance(box.id, 11500, 4000);
    expect(await h.events.find(e.id)).toMatchObject({ realCents: 3000, pendingCents: 4000, pixCents: 3000, cashCents: 0, supplyCostCents: 2500, soldUnits: 4 });
  });
  it("cria/edita/troca caixa/exclui doação preservando histórico", async () => {
    const a = await h.box("A"); const b = await h.box("B"); const d = await donate(a.id);
    const edit = new UpdateDonationUseCase(h.donations, h.boxes);
    await edit.execute(h.actor, { id: d.id, version: 1 }, donationInput(a.id, "80"));
    await balance(a.id, 8000);
    await edit.execute(h.actor, { id: d.id, version: 2 }, donationInput(b.id, "60"));
    await balance(a.id, 0); await balance(b.id, 6000);
    for (const box of [a, b]) expect((await h.boxes.history(box.id, 1, 15)).items.some((i) => i.action === "donation_update")).toBe(true);
    await new DeleteDonationUseCase(h.donations, h.boxes).execute(h.actor, { id: d.id, version: 3 });
    await balance(b.id, 0);
    expect((await h.donations.list({ query: "", cashBoxId: "", year: null, page: 1 }, 15)).total).toBe(0);
    expect(await h.donations.find(d.id)).toBeNull();
    expect(await h.d1.prepare("SELECT deleted_by, version FROM donations WHERE id=?").bind(d.id).first()).toMatchObject({ deleted_by: 1, version: 4 });
    await unchanged(() => edit.execute(h.actor, { id: d.id, version: 4 }, donationInput(b.id)), "DONATION_CHANGED");
  });
  it.each(["reduzir", "excluir", "trocar caixa"])("bloqueia %s de doação utilizada sem alterar D1", async (operation) => {
    const a = await h.box("A"); const b = await h.box("B"); const d = await donate(a.id); await move(a.id, "90", "outgoing");
    await unchanged(() => operation === "excluir" ? new DeleteDonationUseCase(h.donations, h.boxes).execute(h.actor, { id: d.id, version: 1 }) : new UpdateDonationUseCase(h.donations, h.boxes).execute(h.actor, { id: d.id, version: 1 }, donationInput(operation === "trocar caixa" ? b.id : a.id, "5")), "DONATION_INSUFFICIENT_BALANCE");
  });
  it("movimentações recalculam valor/tipo/caixa e exclusão", async () => {
    const a = await h.box("A"); const b = await h.box("B"); await donate(a.id); await donate(b.id);
    const m = await move(a.id, "10", "outgoing"); const edit = new UpdateMovementUseCase(h.movements, h.boxes, h.receipts);
    const input = { ...movementInput(a.id, "15", "outgoing"), id: m.id, version: 1 };
    await edit.execute(h.actor, input); await balance(a.id, 8500);
    await edit.execute(h.actor, { ...input, cashBoxId: b.id, direction: "incoming", amount: "20", version: 2 });
    await balance(a.id, 10000); await balance(b.id, 12000);
    for (const box of [a, b]) expect((await h.boxes.history(box.id, 1, 15)).items.some((i) => i.action === "movement_update")).toBe(true);
    await new DeleteMovementUseCase(h.movements, h.boxes).execute(h.actor, { id: m.id, version: 3 });
    await balance(b.id, 10000);
    expect((await h.movements.list(1, 15)).total).toBe(0);
    expect(await h.movements.find(m.id)).toMatchObject({ deletedBy: 1, version: 4 });
    await unchanged(() => edit.execute(h.actor, { ...input, version: 4 }), "MOVEMENT_CHANGED");
  });
  it.each(["reduzir", "excluir", "trocar caixa"])("bloqueia %s de entrada utilizada", async (operation) => {
    const a = await h.box("A"); const b = await h.box("B"); const m = await move(a.id, "100"); await move(a.id, "90", "outgoing");
    await unchanged(() => operation === "excluir" ? new DeleteMovementUseCase(h.movements, h.boxes).execute(h.actor, { id: m.id, version: 1 }) : new UpdateMovementUseCase(h.movements, h.boxes, h.receipts).execute(h.actor, { ...movementInput(operation === "trocar caixa" ? b.id : a.id, "5"), id: m.id, version: 1 }), "MOVEMENT_INSUFFICIENT_BALANCE");
  });
  it("bloqueia saída e compra sem saldo, permitindo gastar o saldo exato", async () => {
    const a = await h.box(); const e = await event(a.id); await donate(a.id, "10");
    await unchanged(() => move(a.id, "10.01", "outgoing"), "MOVEMENT_INSUFFICIENT_BALANCE");
    await unchanged(() => supply(e.id, a.id, "10.01"), "SUPPLY_INSUFFICIENT_BALANCE");
    await move(a.id, "10", "outgoing"); await balance(a.id, 0);
  });
});

describe("pedidos, catálogo e insumos", () => {
  it("pedido pendente/pago/misto/gratuito/excluído mantém saldos e unidades", async () => {
    const a = await h.box(); const e = await event(a.id); const input = orderInput(e.products[0].id, "40", false);
    const o = await new CreateOrderUseCase(h.events).execute(h.actor, e.id, input);
    await balance(a.id, 0, 4000);
    const edit = new UpdateOrderUseCase(h.events);
    await edit.execute(h.actor, e.id, o.id, 1, { ...input, requestId: uuid(), total: "35", paid: true, cash: "15", pix: "20" });
    await balance(a.id, 3500);
    expect(await h.events.find(e.id)).toMatchObject({ cashCents: 1500, pixCents: 2000, soldUnits: 2 });
    await edit.execute(h.actor, e.id, o.id, 2, { ...input, requestId: uuid(), total: "0", paid: true, cash: "0", pix: "0" });
    await balance(a.id, 0); expect(await h.events.find(e.id)).toMatchObject({ soldUnits: 2 });
    await new DeleteOrderUseCase(h.events).execute(h.actor, e.id, o.id, 3);
    expect((await h.events.listOrders(e.id, "", 1, 15)).total).toBe(0);
    expect(await h.events.find(e.id)).toMatchObject({ soldUnits: 0, realCents: 0, pendingCents: 0 });
    await unchanged(() => edit.execute(h.actor, e.id, o.id, 4, { ...input, requestId: uuid() }), "EVENT_NOT_FOUND");
    const audit = await h.events.history(e.id, 1, 15);
    expect(audit.items.filter((i) => i.resourceType === "order")).toHaveLength(4);
    expect(audit.items.every((i) => i.actorId === 1)).toBe(true);
  });
  it("catálogo atualizado rejeita versão antiga e preserva snapshot do pedido", async () => {
    const a = await h.box(); const input = eventInput(a.id); const e = await new CreateEventUseCase(h.events, h.boxes).execute(h.actor, input);
    const o = await new CreateOrderUseCase(h.events).execute(h.actor, e.id, orderInput(e.products[0].id));
    await new UpdateEventUseCase(h.events, h.boxes).execute(h.actor, e.id, 1, { ...input, requestId: uuid(), products: [{ ...input.products[0], name: "Novo nome", price: "99" }] });
    await unchanged(() => new CreateOrderUseCase(h.events).execute(h.actor, e.id, orderInput(e.products[0].id)), "EVENT_CHANGED");
    const oldOrder = await h.events.findOrder(o.id);
    expect(oldOrder?.items[0]).toMatchObject({ name: "Produto", priceCents: 1000 });
    await new UpdateOrderUseCase(h.events).execute(h.actor, e.id, o.id, 1, { ...orderInput(e.products[0].id, "30", true, 2) });
    expect((await h.events.findOrder(o.id))?.items[0]).toMatchObject({ name: "Produto", priceCents: 1000 });
  });
  it("compra paga por outro caixa: editar/trocar/converter/excluir", async () => {
    const a = await h.box("A"); const b = await h.box("B"); const e = await event(a.id); await donate(a.id); await donate(b.id);
    expect(await h.events.find(e.id)).toMatchObject({ supplyCostCents: 0 });
    const s = await supply(e.id, b.id); await balance(a.id, 10000); await balance(b.id, 7500);
    const edit = new UpdateSupplyUseCase(h.supplies, h.events, h.boxes, h.receipts);
    const input = { ...supplyInput(b.id, "100"), version: 1, retainedReceiptIds: s.receipts.map((r) => r.id) };
    await edit.execute(h.actor, e.id, s.id, input, []); await balance(b.id, 0);
    await edit.execute(h.actor, e.id, s.id, { ...input, cashBoxId: a.id, amount: "30", version: 2 }, []);
    await balance(a.id, 7000); await balance(b.id, 10000);
    expect(await h.events.find(e.id)).toMatchObject({ supplyCostCents: 3000, realCents: 0 });
    await edit.execute(h.actor, e.id, s.id, { ...input, source: "donation", cashBoxId: null, donorName: "  Maria  ", version: 3 }, []);
    await balance(a.id, 10000); expect(await h.events.find(e.id)).toMatchObject({ supplyCostCents: 0 });
    const second = await supply(e.id, a.id, "10");
    await new DeleteSupplyUseCase(h.supplies, h.events).execute(h.actor, e.id, second.id, 1);
    await balance(a.id, 10000); expect(await h.events.find(e.id)).toMatchObject({ supplyCostCents: 0 });
    expect(await h.supplies.find(second.id)).toMatchObject({ deletedBy: 1 });
    await unchanged(() => edit.execute(h.actor, e.id, second.id, { ...input, version: 2 }, []), "SUPPLY_NOT_FOUND");
  });
  it("receber doação material só muda estado/histórico", async () => {
    const a = await h.box(); const e = await event(a.id); const s = await supply(e.id, null, "0");
    await new ReceiveSupplyUseCase(h.supplies, h.events).execute(h.actor, e.id, s.id, 1);
    expect(await h.supplies.find(s.id)).toMatchObject({ received: true, version: 2 });
    await balance(a.id, 0); expect(await h.events.find(e.id)).toMatchObject({ supplyCostCents: 0 });
  });
  it.each(["pedido", "insumo"])("vínculo de %s excluído ainda impede excluir evento", async (kind) => {
    const a = await h.box(); const e = await event(a.id);
    if (kind === "pedido") { const o = await new CreateOrderUseCase(h.events).execute(h.actor, e.id, orderInput(e.products[0].id)); await new DeleteOrderUseCase(h.events).execute(h.actor, e.id, o.id, 1); }
    else { const s = await supply(e.id, null); await new DeleteSupplyUseCase(h.supplies, h.events).execute(h.actor, e.id, s.id, 1); }
    await unchanged(() => new DeleteEventUseCase(h.events).execute(h.actor, e.id, 1), kind === "pedido" ? "EVENT_HAS_ORDERS" : "EVENT_HAS_SUPPLIES");
    await unchanged(() => new DeleteCashBoxUseCase(h.boxes).execute(h.actor, a.id, 1), "CASH_BOX_HAS_MOVEMENTS");
  });
  it("caixa com movimentação excluída mantém proteção e histórico", async () => {
    const a = await h.box(); const m = await move(a.id);
    await new DeleteMovementUseCase(h.movements, h.boxes).execute(h.actor, { id: m.id, version: 1 });
    await unchanged(() => new DeleteCashBoxUseCase(h.boxes).execute(h.actor, a.id, 1), "CASH_BOX_HAS_MOVEMENTS");
  });
});

describe("repetição, concorrência e consultas", () => {
  it("cadastros repetidos não duplicam saldo ou auditoria e conteúdo diferente conflita", async () => {
    const a = await h.box(); const eInput = eventInput(a.id); const eCreate = new CreateEventUseCase(h.events, h.boxes); const e = await eCreate.execute(h.actor, eInput);
    const d = await donate(a.id); const mInput = movementInput(a.id); const mCreate = new CreateMovementUseCase(h.movements, h.boxes, h.receipts); await mCreate.execute(h.actor, mInput);
    const oInput = orderInput(e.products[0].id); const oCreate = new CreateOrderUseCase(h.events); await oCreate.execute(h.actor, e.id, oInput);
    const sInput = supplyInput(a.id); const sCreate = new CreateSupplyUseCase(h.supplies, h.events, h.boxes, h.receipts); await sCreate.execute(h.actor, e.id, sInput, [pdf()]);
    const before = await state();
    await donate(a.id, "100", d.id); await mCreate.execute(h.actor, mInput); await eCreate.execute(h.actor, eInput); await oCreate.execute(h.actor, e.id, oInput); await sCreate.execute(h.actor, e.id, sInput, [pdf()]);
    expect(await state()).toEqual(before); await balance(a.id, 12500);
    await unchanged(() => donate(a.id, "99", d.id), "DONATION_REQUEST_CONFLICT");
    await unchanged(() => mCreate.execute(h.actor, { ...mInput, amount: "99" }), "MOVEMENT_CHANGED");
    await unchanged(() => eCreate.execute(h.actor, { ...eInput, name: "Outro" }), "EVENT_REQUEST_CONFLICT");
    await unchanged(() => oCreate.execute(h.actor, e.id, { ...oInput, customerName: "Outra" }), "EVENT_REQUEST_CONFLICT");
    await unchanged(() => sCreate.execute(h.actor, e.id, { ...sInput, name: "Outro" }, [pdf()]), "SUPPLY_REQUEST_CONFLICT");
  });
  it("duas edições da mesma versão têm somente uma vencedora", async () => {
    const a = await h.box(); const m = await move(a.id); const edit = new UpdateMovementUseCase(h.movements, h.boxes, h.receipts);
    const results = await Promise.allSettled(["30", "40"].map((amount) => edit.execute(h.actor, { ...movementInput(a.id, amount), id: m.id, version: 1 })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toMatchObject([{ reason: { details: { code: "MOVEMENT_CHANGED" } } }]);
    const current = await h.movements.find(m.id); expect(current?.version).toBe(2);
    expect((await h.boxes.find(a.id))?.balanceCents).toBe(current?.amountCents);
    expect((await h.boxes.history(a.id, 1, 15)).items.filter((i) => i.action === "movement_update")).toHaveLength(1);
  });
  it.each(["saída", "compra"])("D1 bloqueia %s concorrente após duas leituras do mesmo saldo", async (kind) => {
    const a = await h.box(); const e = await event(a.id); await donate(a.id);
    // Both callers have already read the same R$ 100. The repository must guard the write independently.
    const observed = await Promise.all([h.boxes.find(a.id), h.boxes.find(a.id)]); expect(observed.map((b) => b?.balanceCents)).toEqual([10000, 10000]);
    let results: string[];
    if (kind === "saída") {
      const template = await move(a.id, "1", "outgoing");
      await new DeleteMovementUseCase(h.movements, h.boxes).execute(h.actor, { id: template.id, version: 1 });
      results = await Promise.all([1, 2].map(() => h.movements.create({ ...template, id: uuid(), amountCents: 7000 })));
    } else {
      const template = await supply(e.id, a.id, "1"); await new DeleteSupplyUseCase(h.supplies, h.events).execute(h.actor, e.id, template.id, 1);
      results = await Promise.all([1, 2].map(() => h.supplies.create({ ...template, id: uuid(), amountCents: 7000 })));
    }
    expect(results.sort()).toEqual(["insufficient", "saved"]); await balance(a.id, 3000);
    const audits = (await h.boxes.history(a.id, 1, 30)).items.filter((i) => kind === "saída" ? i.movementDetails?.after.amountCents === 7000 : i.eventDetails?.after.amountCents === 7000);
    expect(audits).toHaveLength(1);
  });
  it("Home agrega mais de uma página e ignora caixas excluídos", async () => {
    for (let i = 0; i < 16; i++) { const a = await h.box(`Caixa ${i}`); await donate(a.id, "1"); }
    const removed = await h.box("Removido"); await new DeleteCashBoxUseCase(h.boxes).execute(h.actor, removed.id, 1);
    const result = await new GetHomeUseCase(h.boxes, h.events).execute(h.actor);
    expect(result).toMatchObject({ realCents: 1600, pendingCents: 0, boxCount: 16 });
    expect(result.boxes).toHaveLength(16); expect(result.boxes.some((b) => b.id === removed.id)).toBe(false);
    expect((await h.boxes.list("", 1, 15)).items).toHaveLength(15);
  });
  it("nome de caixa único usa normalização Unicode e espaços", async () => {
    await h.box("Caixa Geral");
    await unchanged(() => new CreateCashBoxUseCase(h.boxes).execute(h.actor, { name: "  ＣＡＩＸＡ   geral ", description: "" }), "CASH_BOX_NAME_EXISTS");
  });
});

it.each(["doação", "insumo", "pedido", "evento"])("versão concorrente de %s não sobrescreve a primeira alteração", async (kind) => {
  const a = await h.box(); await donate(a.id);
  const eInput = eventInput(a.id); const e = await new CreateEventUseCase(h.events, h.boxes).execute(h.actor, eInput);
  let attempt: (name: string) => Promise<unknown>;
  let code: string;
  if (kind === "doação") {
    const d = await donate(a.id, "10"); const edit = new UpdateDonationUseCase(h.donations, h.boxes);
    attempt = (name) => edit.execute(h.actor, { id: d.id, version: 1 }, { ...donationInput(a.id, "10"), donorName: name }); code = "DONATION_CHANGED";
  } else if (kind === "insumo") {
    const s = await supply(e.id, null); const edit = new UpdateSupplyUseCase(h.supplies, h.events, h.boxes, h.receipts);
    attempt = (name) => edit.execute(h.actor, e.id, s.id, { ...supplyInput(null), name, version: 1, retainedReceiptIds: [] }, []); code = "SUPPLY_CHANGED";
  } else if (kind === "pedido") {
    const o = await new CreateOrderUseCase(h.events).execute(h.actor, e.id, orderInput(e.products[0].id)); const edit = new UpdateOrderUseCase(h.events);
    attempt = (name) => edit.execute(h.actor, e.id, o.id, 1, { ...orderInput(e.products[0].id), customerName: name }); code = "EVENT_CHANGED";
  } else {
    const edit = new UpdateEventUseCase(h.events, h.boxes);
    attempt = (name) => edit.execute(h.actor, e.id, 1, { ...eInput, requestId: uuid(), name }); code = "EVENT_CHANGED";
  }
  await attempt("Primeira"); await unchanged(() => attempt("Segunda"), code);
});

it("migrações reais produzem banco íntegro com referências válidas", async () => {
  expect(await h.d1.prepare("PRAGMA quick_check").first()).toEqual({ quick_check: "ok" });
  expect((await h.d1.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
});
