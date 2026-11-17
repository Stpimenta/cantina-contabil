import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrepareAccountActivationUseCase } from "@/server/auth/use-cases/prepare-account-activation.use-case";
import { AuthApiRepository } from "@/server/auth/infrastructure/auth-api.repository";
import { UserApiRepository } from "@/server/users/infrastructure/user-api.repository";
import { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import { eq } from "drizzle-orm";
import { harness, type Harness } from "../support/harness";
import { D1LocalAccountRepository } from "@/server/users/infrastructure/d1-local-account.repository";
import { localAccounts } from "@/server/users/infrastructure/local-account.schema";
import { localAccountCashBoxes } from "@/server/users/infrastructure/local-account-cash-box.schema";
import {
  canWriteAccountCashBox,
  requireAccountAdmin,
} from "@/server/auth/models/local-account-policy";

let h: Harness;
let accounts: D1LocalAccountRepository;
const imported = {
  externalUserId: 42,
  name: "Pessoa sintética",
  email: "synthetic@example.invalid",
  now: "2026-11-15T12:00:00Z",
};
const subject = "ec23f39f-c805-48c1-8aad-929264d2d788";
const credentials = {
  gmail: imported.email,
  senha: "synthetic-external-password",
};
function activation(role: string, email = imported.email) {
  const jwt = `e30.${Buffer.from(
    JSON.stringify({
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid": "42",
      status: role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url")}.synthetic`;
  const request = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      new URL(String(url)).pathname === "/api/Login"
        ? { status: true, jwtToken: jwt }
        : { id: 42, nome: imported.name, email },
    ),
  );
  return new PrepareAccountActivationUseCase(
    new AuthApiRepository("https://auth.example.invalid", request),
    new GetOwnProfileUseCase(
      new UserApiRepository("https://auth.example.invalid", request),
    ),
    accounts,
  );
}
beforeEach(async () => {
  h = await harness();
  accounts = new D1LocalAccountRepository(h.db);
});
afterEach(async () => {
  await h?.close();
});

describe("vínculos locais preservam identidade e permissões", () => {
  it.each(["root", "admin", "tesouraria"])(
    "prepara habilitação de %s sem ativar a conta ou copiar senha",
    async (role) => {
      expect(await activation(role).execute(credentials)).toMatchObject({
        email: imported.email,
      });
      const account = await accounts.findByExternalUserId(42);
      expect(account).toMatchObject({
        state: "pending",
        authSubject: null,
        role: "admin",
        authorId: 42,
      });
      const row = await h.d1.prepare("SELECT * FROM local_accounts").first();
      expect(JSON.stringify(row)).not.toContain(credentials.senha);
    },
  );

  it("recusa perfil externo não autorizado antes de reservar conta", async () => {
    await expect(
      activation("member").execute(credentials),
    ).rejects.toMatchObject({ details: { code: "LOGIN_ACCESS_DENIED" } });
    expect(await accounts.findByExternalUserId(42)).toBeNull();
  });

  it("não reabilita conta bloqueada pelo ingresso externo", async () => {
    const account = (await accounts.reserveImported(imported))!;
    await h.db
      .update(localAccounts)
      .set({ state: "blocked", version: 2 })
      .where(eq(localAccounts.id, account.id));
    await expect(
      activation("admin").execute(credentials),
    ).rejects.toMatchObject({ details: { code: "LOGIN_ACCESS_DENIED" } });
    expect(await accounts.findByExternalUserId(42)).toMatchObject({
      state: "blocked",
      version: 2,
    });
  });

  it("recusa e-mail inválido para habilitação sem gravar conta", async () => {
    await expect(
      activation("admin", "invalid").execute(credentials),
    ).rejects.toMatchObject({ details: { code: "INVALID_AUTH_RESPONSE" } });
    expect(await accounts.findByExternalUserId(42)).toBeNull();
  });
  it("reserva importado sem alterar as autorias históricas", async () => {
    const box = await h.box();
    const before = await h.boxes.find(box.id);
    const account = await accounts.reserveImported(imported);
    expect(account).toMatchObject({
      externalUserId: 42,
      authorId: 42,
      role: "admin",
      state: "pending",
      authSubject: null,
    });
    expect(await h.boxes.find(box.id)).toEqual(before);
    expect(await accounts.findBySubject(subject)).toBeNull();
    expect(canWriteAccountCashBox(account!, box.id)).toBe(false);
    expect(() => requireAccountAdmin(account)).toThrow("ACCESS_DENIED");
  });

  it("novo ingresso GestPV não restaura papel, nome, caixas ou bloqueio", async () => {
    const account = (await accounts.reserveImported(imported))!;
    const box = await h.box();
    await h.db
      .update(localAccounts)
      .set({
        role: "operator",
        accessRole: "operator",
        state: "blocked",
        authSubject: subject,
        version: 2,
      })
      .where(eq(localAccounts.id, account.id));
    await h.db
      .insert(localAccountCashBoxes)
      .values({ accountId: account.id, cashBoxId: box.id });
    const before = await accounts.findBySubject(subject);
    const repeated = await accounts.reserveImported({
      ...imported,
      name: "Alterado no provedor",
      email: "changed@example.invalid",
    });
    expect(repeated).toEqual(before);
    expect(repeated).toMatchObject({
      role: "operator",
      state: "blocked",
      cashBoxIds: [box.id],
      version: 2,
    });
  });

  it("colisão de e-mail não vincula outra pessoa ao mesmo usuário", async () => {
    await accounts.reserveImported(imported);
    expect(
      await accounts.reserveImported({
        ...imported,
        externalUserId: 43,
        email: "SYNTHETIC@example.invalid",
      }),
    ).toBeNull();
    expect(await accounts.findByExternalUserId(43)).toBeNull();
  });

  it("reserva concorrente mantém um único vínculo", async () => {
    const [first, second] = await Promise.all([
      accounts.reserveImported(imported),
      accounts.reserveImported(imported),
    ]);
    expect(first?.id).toBe(second?.id);
    expect((await h.db.select().from(localAccounts)).length).toBe(1);
  });

  it("convidado usa autoria negativa e financeiro não ganha gerenciamento", async () => {
    const box = await h.box();
    const other = await h.box("Outro caixa");
    const [row] = await h.db
      .insert(localAccounts)
      .values({
        name: "Convidado sintético",
        email: "invited@example.invalid",
        emailKey: "invited@example.invalid",
        authSubject: subject,
        role: "operator",
        accessRole: "finance",
        accessJson: JSON.stringify({
          cashBoxWriteIds: [box.id],
          eventIds: [],
          eventWriteIds: [],
        }),
        cashBoxIdsJson: JSON.stringify([box.id]),
        state: "active",
        version: 1,
        createdAt: imported.now,
        updatedAt: imported.now,
      })
      .returning();
    await h.db
      .insert(localAccountCashBoxes)
      .values({ accountId: row.id, cashBoxId: box.id });
    const account = (await accounts.findBySubject(subject))!;
    expect(account.authorId).toBe(-row.id);
    expect(account.externalUserId).toBeNull();
    expect(canWriteAccountCashBox(account, box.id)).toBe(true);
    expect(canWriteAccountCashBox(account, other.id)).toBe(false);
    expect(() => requireAccountAdmin(account)).toThrow("ACCESS_DENIED");
  });

  it("identidades vinculadas e contas preservadas não podem ser trocadas ou apagadas", async () => {
    const account = (await accounts.reserveImported(imported))!;
    await h.db
      .update(localAccounts)
      .set({ authSubject: subject })
      .where(eq(localAccounts.id, account.id));
    await expect(
      h.db
        .update(localAccounts)
        .set({ externalUserId: 43 })
        .where(eq(localAccounts.id, account.id)),
    ).rejects.toThrow();
    await expect(
      h.db
        .update(localAccounts)
        .set({ authSubject: "b149ac3e-e4ba-4de3-8ce3-728c70907c57" })
        .where(eq(localAccounts.id, account.id)),
    ).rejects.toThrow();
    await expect(
      h.db.delete(localAccounts).where(eq(localAccounts.id, account.id)),
    ).rejects.toThrow();
    expect((await accounts.findBySubject(subject))?.authorId).toBe(42);
  });
});
