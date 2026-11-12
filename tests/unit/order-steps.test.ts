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
