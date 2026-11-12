import { describe, expect, it, vi } from "vitest";
import { ViaCepPostalAddressRepository } from "@/server/addresses/infrastructure/viacep-postal-address.repository";
import { LookupPostalCodeUseCase } from "@/server/addresses/use-cases/lookup-postal-code.use-case";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import type { Session } from "@/server/auth/models/session.model";
import { session } from "../support/data";
const address = {
  cep: "12345-678",
  logradouro: "Rua sintética",
  bairro: "Centro",
  localidade: "Cidade sintética",
  uf: "SP",
};
function setup(body: unknown = address, status = 200) {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(body, { status }));
  const useCase = new LookupPostalCodeUseCase(
    new ViaCepPostalAddressRepository(request),
  );
  return { request, useCase };
}
describe("consulta autenticada de CEP pelo adaptador ViaCEP", () => {
  it("valida entrada, consulta sem credenciais e retorna somente os campos necessários", async () => {
    const { request, useCase } = setup({
      ...address,
      complemento: "Não importar",
      ddd: "11",
      extra: "ignorar",
    });
    expect(
      await useCase.execute(session(), { postalCode: "12345-678" }),
    ).toEqual({
      postalCode: "12345678",
      street: "Rua sintética",
      neighborhood: "Centro",
      city: "Cidade sintética",
      state: "SP",
    });
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://viacep.com.br/ws/12345678/json/");
    expect(options).toMatchObject({
      cache: "no-store",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it("recusa acesso e CEP inválido antes de consultar", async () => {
    const { request, useCase } = setup();
    await expect(async () =>
      useCase.execute(null, { postalCode: "12345678" }),
    ).rejects.toMatchObject({ details: { code: "SESSION_EXPIRED" } });
    await expect(async () =>
      useCase.execute(
        { ...session(), role: "financeiro" } as unknown as Session,
        { postalCode: "12345678" },
      ),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    await expect(async () =>
      useCase.execute(session(), { postalCode: "123" }),
    ).rejects.toMatchObject({ details: { code: "INVALID_POSTAL_CODE_INPUT" } });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([true, "true"])(
    "distingue CEP não encontrado (%s) de falha",
    async (erro) => {
      const { useCase } = setup({ erro });
      expect(
        await useCase.execute(session(), { postalCode: "12345678" }),
      ).toBeNull();
    },
  );
  it("aceita CEP genérico com rua e bairro ausentes no cadastro postal", async () => {
    const { useCase } = setup({ ...address, logradouro: "", bairro: "" });
    expect(
      await useCase.execute(session(), { postalCode: "12345678" }),
    ).toMatchObject({ street: "", neighborhood: "", state: "SP" });
  });
  it.each([
    { ...address, cep: "87654-321" },
    { ...address, uf: "XX" },
    { ...address, logradouro: undefined },
    { erro: "false" },
    { ...address, localidade: "" },
  ])("recusa contrato inválido ou CEP divergente", async (body) => {
    const { useCase } = setup(body);
    await expect(
      useCase.execute(session(), { postalCode: "12345678" }),
    ).rejects.toBeInstanceOf(InfrastructureError);
  });
  it("recusa HTTP malsucedido e preserva causas de rede e timeout", async () => {
    const { useCase } = setup({}, 503);
    await expect(
      useCase.execute(session(), { postalCode: "12345678" }),
    ).rejects.toBeInstanceOf(InfrastructureError);
    for (const cause of [
      new TypeError("network failure"),
      new DOMException("timeout", "TimeoutError"),
    ]) {
      const request = vi.fn<typeof fetch>().mockRejectedValue(cause);
      const lookup = new LookupPostalCodeUseCase(
        new ViaCepPostalAddressRepository(request),
      );
      await expect(
        lookup.execute(session(), { postalCode: "12345678" }),
      ).rejects.toBe(cause);
    }
  });
});
