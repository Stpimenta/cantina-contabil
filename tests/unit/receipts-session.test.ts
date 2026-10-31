import { describe, expect, it } from "vitest";
import { receiptListSchema, RECEIPT_MAX_BYTES } from "@/shared/receipts/receipt-input";
import { readReceiptContent } from "@/shared/receipts/receipt-content";
import { signSession, verifySession } from "@/server/auth/infrastructure/session-codec";
import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { session } from "../support/data";

describe("comprovantes", () => {
  it("permite cinco arquivos no limite e lista opcional vazia", () => {
    expect(receiptListSchema.safeParse([]).success).toBe(true);
    expect(receiptListSchema.safeParse(Array.from({ length: 5 }, () => ({ type: "application/pdf", size: RECEIPT_MAX_BYTES }))).success).toBe(true);
  });
  it.each([[6, 1, "application/pdf"], [1, RECEIPT_MAX_BYTES + 1, "image/png"], [1, 0, "image/png"], [1, 1, "text/plain"]])("rejeita quantidade/tamanho/tipo: %s/%s/%s", (count, size, type) => expect(receiptListSchema.safeParse(Array.from({ length: count }, () => ({ size, type }))).success).toBe(false));
  it.each([
    ["image/jpeg", [255, 216, 255, 0]],
    ["image/png", [137, 80, 78, 71, 13, 10, 26, 10]],
    ["image/webp", [...new TextEncoder().encode("RIFF0000WEBP")]],
    ["application/pdf", [...new TextEncoder().encode("%PDF-1.4")]],
  ] as const)("confere assinatura real de %s e hash", async (type, bytes) => {
    const file = new File([new Uint8Array(bytes)], "sintetico", { type });
    const result = await readReceiptContent(file);
    expect(new Uint8Array(result.body!)).toEqual(new Uint8Array(bytes));
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect((await readReceiptContent(file)).hash).toBe(result.hash);
    await expect(readReceiptContent(new File(["falso"], "falso", { type }))).rejects.toMatchObject({ details: { code: "INVALID_SUPPLY_INPUT", issues: { receipts: "INVALID_RECEIPT" } } });
  });
});
describe("sessão interna", () => {
  const secret = "segredo-sintetico-exclusivo-de-testes-123456";
  it("aceita sessão válida e rejeita adulteração, outro segredo e expiração", async () => {
    const actor = session();
    const cookie = await signSession(actor, secret);
    expect(await verifySession(cookie, secret, actor.issuedAt * 1000)).toEqual(actor);
    expect(await verifySession(`a${cookie}`, secret)).toBeNull();
    expect(await verifySession(cookie, "outro-segredo-sintetico-de-testes-123456")).toBeNull();
    expect(await verifySession(cookie, secret, actor.expiresAt * 1000)).toBeNull();
  });
  it.each(["", "a.b.c", "%.%", "x".repeat(3801)])("rejeita cookie malformado", async (value) => expect(await verifySession(value, secret)).toBeNull());
  it.each([7201, 0, -1])("rejeita duração inválida %s", async (duration) => { const actor = session(); expect(await verifySession(await signSession({ ...actor, expiresAt: actor.issuedAt + duration }, secret), secret)).toBeNull(); });
  it("rejeita emissão no futuro", async () => { const actor = session(); expect(await verifySession(await signSession(actor, secret), secret, (actor.issuedAt - 1) * 1000)).toBeNull(); });
  it("verifica ausência, expiração e perfil", () => {
    expect(() => checkAccess(null)).toThrow("SESSION_EXPIRED");
    expect(() => checkAccess({ ...session(), expiresAt: 0 })).toThrow("SESSION_EXPIRED");
    expect(() => checkAccess({ ...session(), role: "visitante" } as unknown as Session)).toThrow("ACCESS_DENIED");
    for (const role of ["root", "admin", "tesouraria"] as const) expect(checkAccess({ ...session(), role }).role).toBe(role);
  });
});
