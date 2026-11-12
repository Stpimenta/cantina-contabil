import { describe, expect, it, vi } from "vitest";
import { createOpenApiDocument } from "@/server/api/infrastructure/openapi";
import { saveEventInputSchema } from "@/server/events/inputs/save-event.input";
import {
  validateTemporaryAccess,
  collectCommandSchema,
} from "@/server/canteen/inputs/command.input";
import { credentialCodec } from "@/server/canteen/infrastructure/credential-codec";
import { eventInput, uuid } from "../support/data";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandLoading } from "@/presentation/canteen/components/command-loading";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
describe("contratos da Cantina", () => {
  it("gera OpenAPI 3.1 com cookies, parâmetros, respostas mínimas e erros explícitos", () => {
    const d = createOpenApiDocument("0.6.9");
    expect(d.openapi).toBe("3.1.0");
    expect(Object.keys(d.paths ?? {})).toHaveLength(2);
    expect(d.components?.securitySchemes).toMatchObject({
      appSession: { type: "apiKey", in: "cookie" },
      commandAccess: { type: "apiKey", in: "cookie" },
    });
    const op = d.paths?.["/api/eventos/{id}/comandas/{orderId}"]?.get;
    expect(op?.operationId).toBe("getCommand");
    expect(Object.keys(op?.responses ?? {})).toEqual([
      "200",
      "400",
      "401",
      "403",
      "404",
      "409",
      "500",
      "503",
    ]);
    expect(JSON.stringify(d)).not.toContain("fingerprint");
    expect(JSON.stringify(d)).not.toContain("session_hash");
  });
  it("mantém eventos antigos como padrão e impede Cantina com Entregas", () => {
    expect(saveEventInputSchema.parse(eventInput(uuid())).canteenEnabled).toBe(
      false,
    );
    expect(
      saveEventInputSchema.safeParse({
        ...eventInput(uuid()),
        canteenEnabled: true,
        deliveryEnabled: true,
      }).success,
    ).toBe(false);
  });
  it("exige nome e vencimento futuro sem impor limite máximo", () => {
    expect(
      validateTemporaryAccess({
        requestId: uuid(),
        name: "",
        expiresAt: Date.now() / 1000 + 7200,
      }).ok,
    ).toBe(false);
    expect(
      validateTemporaryAccess({
        requestId: uuid(),
        name: "Caixa",
        expiresAt: Math.floor(Date.now() / 1000) - 1,
      }).ok,
    ).toBe(false);
    expect(
      validateTemporaryAccess({
        requestId: uuid(),
        name: "Caixa",
        expiresAt: Math.floor(Date.now() / 1000) + 365 * 86400,
      }).ok,
    ).toBe(true);
    expect(
      collectCommandSchema.safeParse({
        requestId: uuid(),
        version: 0,
        collected: true,
      }).success,
    ).toBe(false);
  });
  it("usa segredo aleatório de 256 bits e hash SHA-256, sem armazenar o original", async () => {
    const a = credentialCodec.random(),
      b = credentialCodec.random();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(b).not.toBe(a);
    expect(await credentialCodec.hash(a)).not.toBe(a);
    expect(await credentialCodec.hash(a)).toHaveLength(64);
  });
  it("fallback mantém busca, situação e ações desabilitadas com skeleton e anúncio acessível", () => {
    const html = renderToStaticMarkup(createElement(CommandLoading));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Buscar pelo nome");
    expect(html).toContain("Aguardando retirada");
    expect(html).toContain("disabled");
    expect(html).not.toContain("empty-states");
  });
});
