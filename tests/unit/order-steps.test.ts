import { describe, expect, it } from "vitest";
import {
  validateOrderForm,
  firstOrderErrorStep,
} from "@/presentation/events/order-form-validation";
import { validateUpdateOrderStatus } from "@/server/events/inputs/update-order-status.input";
import { uuid } from "../support/data";
const input = () => ({
  requestId: uuid(),
  catalogVersion: 1,
  customerName: "Pessoa",
  note: "",
  items: [{ productId: uuid(), quantity: 1 }],
  total: "10",
  paid: false,
  cash: "0",
  pix: "0",
  fulfillmentMode: null,
});
describe("etapas do pedido", () => {
  it("mantém comprovante opcional e direciona arquivo inválido para Pagamento", () => {
    expect(validateOrderForm(input(), false, 2)).toBeNull();
    const failure = validateOrderForm(
      { ...input(), receipts: [{ type: "application/pdf", size: 0 }] },
      false,
    );
    expect(failure?.fields).toHaveProperty("receipts");
    expect(firstOrderErrorStep(failure!)).toBe(2);
    expect(
      validateOrderForm(
        {
          ...input(),
          retainedReceiptIds: Array.from({ length: 5 }, () => uuid()),
          receipts: [{ type: "application/pdf", size: 20 }],
        },
        false,
        2,
      )?.fields,
    ).toHaveProperty("receipts");
  });
  it("valida a etapa atual com o mesmo contrato sem exigir etapas futuras", () => {
    expect(validateOrderForm(input(), true, 0)).toBeNull();
    expect(
      validateOrderForm({ ...input(), total: "" }, true, 1)?.fields,
    ).toHaveProperty("fulfillmentMode");
    expect(validateOrderForm(input(), true, 1)?.fields).toHaveProperty(
      "fulfillmentMode",
    );
    expect(
      validateOrderForm(
        { ...input(), customerName: "", fulfillmentMode: "pickup" },
        true,
        1,
      ),
    ).toBeNull();
    expect(validateOrderForm({ ...input(), total: "" }, true, 0)).toBeNull();
    expect(
      validateOrderForm({ ...input(), total: "" }, true, 2)?.fields,
    ).toHaveProperty("total");
  });
  it("direciona erro final para a primeira etapa inválida e conserva nomes dos campos", () => {
    const failure = validateOrderForm({ ...input(), customerName: "" }, true)!;
    expect(firstOrderErrorStep(failure)).toBe(0);
    expect(firstOrderErrorStep(validateOrderForm(input(), true)!)).toBe(1);
    expect(
      firstOrderErrorStep(
        validateOrderForm(
          { ...input(), fulfillmentMode: "pickup", total: "" },
          true,
        )!,
      ),
    ).toBe(2);
  });
  it("situação aceita comprovante sem mudança financeira e limita novos mais mantidos", () => {
    expect(
      validateUpdateOrderStatus({
        requestId: uuid(),
        receipts: [{ type: "application/pdf", size: 20 }],
      }).ok,
    ).toBe(true);
    expect(
      validateUpdateOrderStatus({ requestId: uuid(), retainedReceiptIds: [] })
        .ok,
    ).toBe(true);
    expect(
      validateUpdateOrderStatus({
        requestId: uuid(),
        receipts: [{ type: "application/pdf", size: 20 }],
        retainedReceiptIds: Array.from({ length: 5 }, () => uuid()),
      }).ok,
    ).toBe(false);
  });
  it("valida alterações independentes e não aceita um pedido sem alteração", () => {
    expect(
      validateUpdateOrderStatus({ requestId: uuid(), fulfilled: true }).ok,
    ).toBe(true);
    expect(
      validateUpdateOrderStatus({ requestId: uuid(), fulfilled: false }).ok,
    ).toBe(true);
    expect(validateUpdateOrderStatus({ requestId: uuid() }).ok).toBe(false);
    expect(
      validateUpdateOrderStatus({ requestId: uuid(), fulfilled: "true" }).ok,
    ).toBe(false);
    const result = validateUpdateOrderStatus(
      {
        requestId: uuid(),
        fulfilled: true,
        payment: { method: "mixed", cash: "11" },
      },
      1000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.issues).toHaveProperty("payment.cash");
  });
  it("recusa pagamento misto acima do valor e mantém gratuidade", () => {
    expect(
      validateUpdateOrderStatus(
        { requestId: uuid(), payment: { method: "mixed", cash: "10.01" } },
        1000,
      ).ok,
    ).toBe(false);
    expect(
      validateUpdateOrderStatus(
        { requestId: uuid(), payment: { method: "pix", cash: "0" } },
        0,
      ).ok,
    ).toBe(true);
  });
});
