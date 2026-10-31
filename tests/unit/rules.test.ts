import { describe, expect, it } from "vitest";
import { parseMoney } from "@/shared/validation/money-input";
import {
  parseDonationAmount,
  checkDonationBalance,
} from "@/server/donations/models/donation-rules";
import {
  checkMovementBalance,
  movementEffect,
} from "@/server/movements/models/movement-rules";
import { isDateOnly, parseBrazilianDate } from "@/shared/dates/date-only";
import { validateDonation } from "@/server/donations/inputs/create-donation.input";
import {
  validateMovementCreate,
  validateMovementUpdate,
} from "@/server/movements/inputs/movement.input";
import { validateSaveCashBox } from "@/server/cash-boxes/inputs/save-cash-box.input";
import { validateSaveEvent } from "@/server/events/inputs/save-event.input";
import { orderFields } from "@/server/events/models/event-rules";
import type { Event } from "@/server/events/models/event.model";
import { parseInput } from "@/shared/validation/input";
import { validateSaveOrder } from "@/server/events/inputs/save-order.input";
import { validateCreateSupply } from "@/server/events/inputs/create-supply.input";
import {
  donationInput,
  eventInput,
  movementInput,
  supplyInput,
  uuid,
} from "../support/data";

describe("dinheiro e precisão", () => {
  it.each([
    ["0", 0],
    ["0.01", 1],
    ["10,1", 1010],
    [" 10.25 ", 1025],
    ["90071992547409.91", Number.MAX_SAFE_INTEGER],
  ])("converte %s em %s centavos", (input, expected) =>
    expect(parseMoney(input)).toBe(expected),
  );
  it.each([
    "-1",
    "1.001",
    "1.000,00",
    "abc",
    "",
    "1e3",
    "NaN",
    "90071992547409.92",
  ])("rejeita %s", (input) => {
    expect(parseMoney(input)).toBeNull();
    expect(parseDonationAmount(input)).toBeNull();
  });
  it("doação financeira exige valor positivo", () => {
    expect(parseDonationAmount("0")).toBeNull();
    expect(parseDonationAmount("0.01")).toBe(1);
  });
  it("entrada e saída têm efeitos opostos exatos", () => {
    expect(movementEffect("incoming", 101)).toBe(101n);
    expect(movementEffect("outgoing", 101)).toBe(-101n);
  });
  it.each([checkMovementBalance, checkDonationBalance])(
    "protege os limites sem rejeitar saldo zero",
    (check) => {
      expect(() => check(100, -100n)).not.toThrow();
      expect(() => check(100, -101n)).toThrow(/INSUFFICIENT_BALANCE/);
      expect(() => check(Number.MAX_SAFE_INTEGER, 1n)).toThrow("AMOUNT_LIMIT");
    },
  );
});
describe("datas civis", () => {
  it.each(["2024-02-29", "2026-10-30"])("aceita %s", (date) =>
    expect(isDateOnly(date)).toBe(true),
  );
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "0000-01-01",
    "30/10/2026",
    "2026-1-01",
  ])("rejeita %s", (date) => expect(isDateOnly(date)).toBe(false));
  it("converte dd/mm/aaaa sem aceitar data inexistente", () => {
    expect(parseBrazilianDate("29/02/2024")).toBe("2024-02-29");
    expect(parseBrazilianDate("29/02/2026")).toBeNull();
  });
});
describe("inputs e erros técnicos", () => {
  it("normaliza nomes e não vaza objetos Zod", () => {
    expect(
      validateSaveCashBox({
        name: "  Caixa   geral  ",
        description: "  Nota  ",
      }),
    ).toEqual({
      ok: true,
      value: { name: "Caixa geral", description: "Nota" },
    });
    expect(validateSaveCashBox({ name: " ", description: "" })).toEqual({
      ok: false,
      error: {
        code: "INVALID_CASH_BOX_INPUT",
        category: "validation",
        issues: { name: "INVALID_CASH_BOX_NAME" },
      },
    });
  });
  it.each([100, 101])("limite do nome do doador: %i", (length) =>
    expect(
      validateDonation({
        ...donationInput(uuid()),
        donorName: "a".repeat(length),
      }).ok,
    ).toBe(length === 100),
  );
  it.each([500, 501])("limite da justificativa: %i", (length) =>
    expect(
      validateMovementCreate({
        ...movementInput(uuid()),
        reason: "a".repeat(length),
      }).ok,
    ).toBe(length === 500),
  );
  it.each([
    { amount: "0" },
    { amount: "-1" },
    { reason: " " },
    { occurredOn: "2026-02-30" },
    { cashBoxId: "inválido" },
    { requestId: "inválido" },
  ])("rejeita movimentação inválida %j", (patch) =>
    expect(
      validateMovementCreate({ ...movementInput(uuid()), ...patch }).ok,
    ).toBe(false),
  );
  it("rejeita versão inválida", () =>
    expect(
      validateMovementUpdate({
        ...movementInput(uuid()),
        id: uuid(),
        version: 0,
      }).ok,
    ).toBe(false));
  it("limita descrição de evento", () => {
    const input = eventInput(uuid());
    expect(
      validateSaveEvent({ ...input, description: "a".repeat(500) }).ok,
    ).toBe(true);
    expect(
      validateSaveEvent({ ...input, description: "a".repeat(501) }).ok,
    ).toBe(false);
  });
  it("normaliza doador sem exigir nome", () => {
    const result = validateDonation({
      ...donationInput(uuid()),
      donorName: "  Maria  ",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { donorName: "Maria", amountCents: 10000 },
    });
    expect(
      validateDonation({ ...donationInput(uuid()), donorName: "" }).ok,
    ).toBe(true);
  });
});
describe("pedidos e insumos", () => {
  const order = () => ({
    requestId: uuid(),
    catalogVersion: 1,
    customerName: "Pessoa",
    note: "",
    items: [{ productId: uuid(), quantity: 1 }],
    total: "10",
    paid: true,
    cash: "0",
    pix: "10",
  });
  it.each([
    { cash: "10", pix: "0" },
    { cash: "0", pix: "10" },
    { cash: "4", pix: "6" },
    { total: "0", cash: "0", pix: "0" },
    { paid: false, cash: "0", pix: "0" },
  ])("aceita pagamento %j", (patch) =>
    expect(validateSaveOrder({ ...order(), ...patch }).ok).toBe(true),
  );
  it.each([
    { cash: "5", pix: "6" },
    { paid: false },
    { total: "-1" },
    { items: [] },
  ])("rejeita pedido %j", (patch) =>
    expect(validateSaveOrder({ ...order(), ...patch }).ok).toBe(false),
  );
  it("doação material aceita zero e normaliza doador", () =>
    expect(
      validateCreateSupply({
        ...supplyInput(null, "0"),
        donorName: "  Maria  ",
        receipts: [],
      }),
    ).toMatchObject({
      ok: true,
      value: { amount: 0, donorName: "Maria", received: false },
    }));
  it.each([
    { amount: "0" },
    { cashBoxId: null },
    { receipts: [] },
    { received: false },
  ])("compra exige campos %j", (patch) =>
    expect(
      validateCreateSupply({
        ...supplyInput(uuid()),
        receipts: [{ type: "application/pdf", size: 10 }],
        ...patch,
      }).ok,
    ).toBe(false),
  );
  it("doação material não aceita caixa", () =>
    expect(
      validateCreateSupply({
        ...supplyInput(uuid()),
        source: "donation",
        receipts: [],
      }).ok,
    ).toBe(false));
});

it("pedido rejeita produto ausente e subtotal fora da precisão segura", () => {
  const productId = uuid();
  const input = parseInput(
    validateSaveOrder({
      requestId: uuid(),
      catalogVersion: 1,
      customerName: "Pessoa",
      note: "",
      items: [{ productId, quantity: 2 }],
      total: "0",
      paid: false,
      cash: "0",
      pix: "0",
    }),
  );
  const event = { products: [] } as unknown as Event;
  expect(() => orderFields(input, event)).toThrow("INVALID_ORDER_PRODUCT");
  expect(() =>
    orderFields(input, {
      ...event,
      products: [
        {
          id: productId,
          name: "Produto",
          icon: "bag",
          priceCents: Number.MAX_SAFE_INTEGER,
        },
      ],
    }),
  ).toThrow("AMOUNT_LIMIT");
});
