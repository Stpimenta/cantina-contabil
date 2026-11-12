import { describe, expect, it } from "vitest";
import { validateOrderQuery } from "@/server/events/inputs/event-query.input";
describe("filtros de pedidos", () => {
  it("combina busca, página, pagamento e transporte sem misturar as situações", () => {
    expect(
      validateOrderQuery({
        query: " Pessoa ",
        page: 2,
        status: "paid",
        fulfillment: "pending",
      }),
    ).toEqual({
      ok: true,
      value: {
        query: "Pessoa",
        page: 2,
        status: "paid",
        fulfillment: "pending",
      },
    });
  });
  it.each([undefined, "outro", true, "delivered"])(
    "normaliza filtro de transporte desconhecido %s para Todos",
    (fulfillment) => {
      const result = validateOrderQuery({ fulfillment });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.fulfillment).toBe("all");
    },
  );
});
