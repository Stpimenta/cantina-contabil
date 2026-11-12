import { describe, expect, it } from "vitest";
import {
  maskBrazilianPhone,
  maskBrazilianPostalCode,
} from "@/shared/masks/input-masks";
import { mergePostalAddress } from "@/presentation/addresses/merge-postal-address";
import {
  emptyOrderAddress,
  contactPhoneSchema,
} from "@/server/events/inputs/order-delivery.input";
import { validateLookupPostalCode } from "@/server/addresses/inputs/lookup-postal-code.input";

describe("máscaras e preenchimento de endereço", () => {
  it.each([
    ["", ""],
    ["123", "123"],
    ["123456", "12345-6"],
    ["12345678", "12345-678"],
    ["12345-678", "12345-678"],
    ["abc1234567890", "12345-678"],
  ])("formata CEP %s", (input, expected) => {
    expect(maskBrazilianPostalCode(input)).toBe(expected);
  });
  it.each([
    ["", ""],
    ["1", "(1"],
    ["11", "(11"],
    ["113", "(11) 3"],
    ["1133334444", "(11) 3333-4444"],
    ["11999998888", "(11) 99999-8888"],
    ["(11) 99999-8888", "(11) 99999-8888"],
  ])("formata telefone %s", (input, expected) => {
    expect(maskBrazilianPhone(input)).toBe(expected);
  });
  it("preserva validação de DDD e normalização do contato no servidor", () => {
    expect(contactPhoneSchema.parse(maskBrazilianPhone("11999998888"))).toBe(
      "11999998888",
    );
    expect(
      contactPhoneSchema.safeParse(maskBrazilianPhone("20999998888")).success,
    ).toBe(false);
  });
  it("consulta só CEP completo e normaliza os formatos aceitos", () => {
    expect(validateLookupPostalCode({ postalCode: "12345-678" })).toEqual({
      ok: true,
      value: { postalCode: "12345678" },
    });
    for (const postalCode of [
      "",
      "123",
      "123456789",
      "1234a678",
      "https://example.invalid",
    ]) {
      expect(validateLookupPostalCode({ postalCode }).ok).toBe(false);
    }
  });
  it("preenche sem perder dados pessoais nem correções durante a consulta", () => {
    const before = {
      ...emptyOrderAddress,
      postalCode: "12345-678",
      street: "Anterior",
      number: "20",
      complement: "Casa",
      reference: "Portão",
    };
    const current = { ...before, street: "Minha correção", number: "21" };
    const found = {
      postalCode: "12345678",
      street: "Rua da API",
      neighborhood: "Centro",
      city: "Cidade",
      state: "SP",
    };
    expect(mergePostalAddress(current, before, found)).toEqual({
      ...current,
      neighborhood: "Centro",
      city: "Cidade",
      state: "SP",
    });
    const changed = { ...current, postalCode: "87654-321" };
    expect(mergePostalAddress(changed, before, found)).toBe(changed);
    expect(
      mergePostalAddress(before, before, { ...found, street: "" }).street,
    ).toBe("Anterior");
  });
});
