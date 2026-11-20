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
        period: "all",
        query: "Pessoa",
        page: 2,
        status: "paid",
        fulfillment: "pending",
      },
    });
  });
  it.each(["all", "week", "month"])(
    "preserva período %s com retirados e pagamento",
    (period) => {
      const result = validateOrderQuery({
        period,
        fulfillment: "completed",
        status: "pending",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.period).toBe(period);
        expect(result.value.fulfillment).toBe("completed");
        expect(result.value.status).toBe("pending");
      }
    },
  );
  it.each([undefined, "invalid", true])(
    "normaliza período inválido %s para Todos",
    (period) => {
      const result = validateOrderQuery({ period });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.period).toBe("all");
    },
  );
  it.each([undefined, "outro", true, "delivered"])(
    "normaliza filtro de transporte desconhecido %s para Todos",
    (fulfillment) => {
      const result = validateOrderQuery({ fulfillment });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.fulfillment).toBe("all");
    },
  );
});
