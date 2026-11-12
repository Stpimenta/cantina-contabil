import { describe, expect, it } from "vitest";
import { validateSaveEvent } from "@/server/events/inputs/save-event.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { eventInput, uuid } from "../support/data";
describe("produtos opcionais do evento", () => {
  it("aceita catálogo vazio sem tornar os outros campos opcionais", () => {
    const input = { ...eventInput(uuid()), products: [] };
    expect(validateSaveEvent(input).ok).toBe(true);
    expect(validateSaveEvent({ ...input, name: "" }).ok).toBe(false);
  });
  it("identifica nome e preço separadamente em uma linha adicionada", () => {
    const input = eventInput(uuid());
    const result = validateSaveEvent({
      ...input,
      products: [{ ...input.products[0], name: "", price: "" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(presentBusinessFailure(result.error).fields).toMatchObject({
      "products.0.name": "Informe o nome do produto.",
      "products.0.price": "Informe um preço válido.",
    });
    expect(
      validateSaveEvent({
        ...input,
        products: [{ ...input.products[0], price: "0" }],
      }).ok,
    ).toBe(true);
  });
  it("preserva a rejeição de produtos duplicados", () => {
    const input = eventInput(uuid());
    expect(
      validateSaveEvent({
        ...input,
        products: [input.products[0], input.products[0]],
      }).ok,
    ).toBe(false);
  });
});
