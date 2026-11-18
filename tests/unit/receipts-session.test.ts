import { describe, expect, it } from "vitest";
import {
  receiptListSchema,
  RECEIPT_MAX_BYTES,
} from "@/shared/receipts/receipt-input";
import { readReceiptContent } from "@/shared/receipts/receipt-content";
import { checkAccess } from "@/shared/auth/check-access";
import type { Session } from "@/server/auth/models/session.model";
import { session } from "../support/data";

describe("comprovantes", () => {
  it("permite cinco arquivos no limite e lista opcional vazia", () => {
    expect(receiptListSchema.safeParse([]).success).toBe(true);
    expect(
      receiptListSchema.safeParse(
        Array.from({ length: 5 }, () => ({
          type: "application/pdf",
          size: RECEIPT_MAX_BYTES,
        })),
      ).success,
    ).toBe(true);
  });
  it.each([
    [6, 1, "application/pdf"],
    [1, RECEIPT_MAX_BYTES + 1, "image/png"],
    [1, 0, "image/png"],
    [1, 1, "text/plain"],
  ])("rejeita quantidade/tamanho/tipo: %s/%s/%s", (count, size, type) =>
    expect(
      receiptListSchema.safeParse(
        Array.from({ length: count }, () => ({ size, type })),
      ).success,
    ).toBe(false),
  );
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
    await expect(
      readReceiptContent(new File(["falso"], "falso", { type })),
    ).rejects.toMatchObject({
      details: {
        code: "INVALID_SUPPLY_INPUT",
        issues: { receipts: "INVALID_RECEIPT" },
      },
    });
  });
});
describe("sessão interna", () => {
  it("verifica ausência, expiração e perfil", () => {
    expect(() => checkAccess(null)).toThrow("SESSION_EXPIRED");
    expect(() => checkAccess({ ...session(), expiresAt: 0 })).toThrow(
      "SESSION_EXPIRED",
    );
    expect(() =>
      checkAccess({ ...session(), role: "visitante" } as unknown as Session),
    ).toThrow("ACCESS_DENIED");
    for (const role of ["root", "admin", "tesouraria"] as const)
      expect(checkAccess({ ...session(), role }).role).toBe(role);
  });
});
