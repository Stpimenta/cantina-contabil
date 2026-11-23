import { describe, expect, it } from "vitest";
import { suggestAddressOrder } from "@/server/deliveries/models/suggest-address-order";
import { routeState } from "@/server/deliveries/models/route-state";
import { type DeliveryOrder } from "@/server/deliveries/models/delivery-order.model";
import { emptyOrderAddress } from "@/server/events/inputs/order-delivery.input";
const order = (id: string, number: string | null): DeliveryOrder => ({
  id,
  version: 1,
  customerName: id,
  note: "",
  address: number
    ? {
        ...emptyOrderAddress,
        street: "Rua Teste",
        number,
        neighborhood: "Centro",
        city: "Cidade",
        state: "SP",
      }
    : null,
  contactPhone: "",
  fulfilled: false,
  items: [],
  routeId: null,
});
describe("planejamento simples de entregas", () => {
  it("ordena números naturalmente, preserva empates e posições sem endereço sem modificar o rascunho", () => {
    const original = [
      order("dez", "10"),
      order("sem-endereco", null),
      order("dois", "2"),
      order("mesmo-numero", "2"),
    ];
    expect(suggestAddressOrder(original).map((o) => o.id)).toEqual([
      "dois",
      "sem-endereco",
      "mesmo-numero",
      "dez",
    ]);
    expect(original.map((o) => o.id)).toEqual([
      "dez",
      "sem-endereco",
      "dois",
      "mesmo-numero",
    ]);
  });
  it("conclui por todas as entregas e reabre ao desfazer, sem confundir rota vazia com concluída", () => {
    const startedAt = "2026-11-22T12:00:00Z",
      orders = [{ fulfilled: true }, { fulfilled: true }];
    expect(routeState({ startedAt, orders })).toBe("completed");
    expect(
      routeState({
        startedAt,
        orders: [{ fulfilled: true }, { fulfilled: false }],
      }),
    ).toBe("started");
    expect(routeState({ startedAt: null, orders: [] })).toBe("ready");
  });
});
