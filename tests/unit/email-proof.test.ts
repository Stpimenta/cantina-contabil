import { describe, expect, it } from "vitest";
import { readEmailProof } from "@/presentation/auth/models/read-email-proof";

describe("captura da prova de e-mail", () => {
  it.each(["invite", "recovery"])(
    "aceita fragmento de %s sem consumir a prova",
    (type) => {
      expect(
        readEmailProof(
          `https://app.example.invalid/auth/confirm#token_hash=synthetic-proof&type=${type}`,
        ),
      ).toEqual({ tokenHash: "synthetic-proof", type });
    },
  );
  it("preserva compatibilidade com parâmetros de consulta", () => {
    expect(
      readEmailProof(
        "https://app.example.invalid/auth/confirm?token_hash=synthetic-proof&type=recovery",
      ),
    ).toEqual({ tokenHash: "synthetic-proof", type: "recovery" });
  });
  it.each([
    "",
    "#token_hash=synthetic-proof",
    "#token_hash=&type=recovery",
    "#token_hash=synthetic-proof&type=signup",
    "#token_hash=bad%20proof&type=recovery",
    "?type=recovery#token_hash=synthetic-proof",
  ])("recusa prova ausente, inválida ou dividida: %s", (suffix) => {
    expect(
      readEmailProof(`https://app.example.invalid/auth/confirm${suffix}`),
    ).toBeNull();
  });
  it("uma leitura sem prova não impede capturar um link posterior", () => {
    expect(
      readEmailProof("https://app.example.invalid/auth/confirm"),
    ).toBeNull();
    expect(
      readEmailProof(
        "https://app.example.invalid/auth/confirm#token_hash=new-proof&type=recovery",
      ),
    ).toEqual({ tokenHash: "new-proof", type: "recovery" });
  });
});
