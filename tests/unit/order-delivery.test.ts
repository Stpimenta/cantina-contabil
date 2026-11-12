import { describe, expect, it } from "vitest";
import {
  emptyOrderAddress,
  orderAddressSchema,
  contactPhoneSchema,
} from "@/server/events/inputs/order-delivery.input";
import { validateSaveOrder } from "@/server/events/inputs/save-order.input";
import {
  formatOrderAddress,
  orderMapsUrl,
} from "@/shared/formatting/order-address";
import { uuid } from "../support/data";
const address = {
  ...emptyOrderAddress,
  street: "Rua Sintética",
  number: "12",
  neighborhood: "Centro",
  city: "Cidade teste",
  state: "SP",
};
const order = () => ({
  requestId: uuid(),
  catalogVersion: 1,
  customerName: "Pessoa",
  note: "",
  items: [{ productId: uuid(), quantity: 1 }],
  total: "10",
  paid: false,
  cash: "0",
  pix: "0",
});
describe("endereço e contato de entrega", () => {
  it("permite endereço ausente e exige essenciais quando iniciado", () => {
    expect(orderAddressSchema.parse(emptyOrderAddress)).toBeNull();
    expect(
      orderAddressSchema.safeParse({
        ...emptyOrderAddress,
        reference: "Portão",
      }).success,
    ).toBe(false);
    expect(orderAddressSchema.safeParse(address).success).toBe(true);
    expect(
      orderAddressSchema.safeParse({ ...address, number: "" }).success,
    ).toBe(false);
    expect(
      orderAddressSchema.parse({ ...address, number: "", noNumber: true }),
    ).toMatchObject({ number: "", noNumber: true });
  });
  it.each(["123", "12345-6789", "abcdefgh", "123456789"])(
    "recusa CEP inválido %s",
    (postalCode) => {
      expect(
        orderAddressSchema.safeParse({ ...address, postalCode }).success,
      ).toBe(false);
    },
  );
  it.each(["", "12345-678", "12345678"])(
    "aceita CEP opcional %s",
    (postalCode) => {
      expect(
        orderAddressSchema.safeParse({ ...address, postalCode }).success,
      ).toBe(true);
    },
  );
  it("valida UF e limites sem truncar endereço", () => {
    expect(
      orderAddressSchema.safeParse({ ...address, state: "XX" }).success,
    ).toBe(false);
    expect(
      orderAddressSchema.safeParse({ ...address, street: "a".repeat(101) })
        .success,
    ).toBe(false);
  });
  it.each(["", "(11) 99999-9999", "11 3333-4444"])(
    "aceita contato %s",
    (phone) => {
      expect(contactPhoneSchema.safeParse(phone).success).toBe(true);
    },
  );
  it.each([
    "999999999",
    "00999999999",
    "20999999999",
    "1191234567",
    "11abc99999999",
  ])("recusa contato inválido %s", (phone) => {
    expect(contactPhoneSchema.safeParse(phone).success).toBe(false);
  });
  it("exige modalidade apenas em eventos habilitados, sem exigir endereço ou pagamento", () => {
    expect(validateSaveOrder(order()).ok).toBe(true);
    expect(validateSaveOrder(order(), true).ok).toBe(false);
    expect(
      validateSaveOrder(
        { ...order(), fulfillmentMode: "delivery", fulfilled: true },
        true,
      ).ok,
    ).toBe(true);
    expect(
      validateSaveOrder(
        { ...order(), fulfillmentMode: "pickup", address },
        true,
      ).ok,
    ).toBe(false);
  });
  it("gera somente link de busca no Maps sem complemento, referência ou telefone", () => {
    expect(orderMapsUrl(emptyOrderAddress)).toBeNull();
    const value = {
      ...address,
      complement: "Apartamento privado",
      reference: "Detalhe privado",
    };
    const url = new URL(orderMapsUrl(value)!);
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("query")).toContain("Rua Sintética, 12");
    expect(url.searchParams.get("query")).not.toContain("privado");
    expect(formatOrderAddress(value)).toContain("Apartamento privado");
  });
});
