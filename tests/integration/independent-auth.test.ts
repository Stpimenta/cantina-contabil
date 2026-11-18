import { LoginOrActivateAccountUseCase } from "@/server/auth/use-cases/login-or-activate-account.use-case";
import { StartAccountActivationUseCase } from "@/server/auth/use-cases/start-account-activation.use-case";
import { PrepareAccountActivationUseCase } from "@/server/auth/use-cases/prepare-account-activation.use-case";
import { AuthApiRepository } from "@/server/auth/infrastructure/auth-api.repository";
import { UserApiRepository } from "@/server/users/infrastructure/user-api.repository";
import { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { harness, type Harness } from "../support/harness";
import { uuid, movementInput } from "../support/data";
import { D1LocalAccountRepository } from "@/server/users/infrastructure/d1-local-account.repository";
import { localAccounts } from "@/server/users/infrastructure/local-account.schema";
import { D1AccountSessionRepository } from "@/server/auth/infrastructure/d1-account-session.repository";
import { accountSessions } from "@/server/auth/infrastructure/account-session.schema";
import { D1AccountLifecycleRepository } from "@/server/auth/infrastructure/d1-account-lifecycle.repository";
import { AccountCredentialCodec } from "@/server/auth/infrastructure/account-credential-codec";
import { AccountLoginUseCase } from "@/server/auth/use-cases/account-login.use-case";
import { GetAccountSessionUseCase } from "@/server/auth/use-cases/get-account-session.use-case";
import { AccountLogoutUseCase } from "@/server/auth/use-cases/account-logout.use-case";
import { ConfirmAccountEmailUseCase } from "@/server/auth/use-cases/confirm-account-email.use-case";
import { CompleteAccountPasswordUseCase } from "@/server/auth/use-cases/complete-account-password.use-case";
import { RequestAccountRecoveryUseCase } from "@/server/auth/use-cases/request-account-recovery.use-case";
import { InviteLocalAccountUseCase } from "@/server/users/use-cases/invite-local-account.use-case";
import { CancelAccountInvitationUseCase } from "@/server/users/use-cases/cancel-account-invitation.use-case";
import { DeleteLocalAccountUseCase } from "@/server/users/use-cases/delete-local-account.use-case";
import { ManageLocalAccountUseCase } from "@/server/users/use-cases/manage-local-account.use-case";
import { ListCashBoxesUseCase } from "@/server/cash-boxes/use-cases/list-cash-boxes.use-case";
import { CreateCashBoxUseCase } from "@/server/cash-boxes/use-cases/create-cash-box.use-case";
import { CreateMovementUseCase } from "@/server/movements/use-cases/create-movement.use-case";
import { UpdateMovementUseCase } from "@/server/movements/use-cases/update-movement.use-case";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { AccountAuthRepository } from "@/server/auth/repositories/account-auth.repository";
import type { AccountEnrollmentRepository } from "@/server/auth/repositories/account-enrollment.repository";
import type { AccountTokens } from "@/server/auth/models/account-tokens.model";
import type { BrowserCredentialRepository } from "@/server/auth/repositories/browser-credential.repository";
function browser() {
  let value: string | null = null;
  return {
    read: async () => value,
    write: async (v: string) => {
      value = v;
    },
    clear: async () => {
      value = null;
    },
  } satisfies BrowserCredentialRepository;
}
let h: Harness,
  accounts: D1LocalAccountRepository,
  sessions: D1AccountSessionRepository,
  lifecycle: D1AccountLifecycleRepository,
  codec: AccountCredentialCodec,
  normal: ReturnType<typeof browser>,
  setup: ReturnType<typeof browser>,
  provider: AccountAuthRepository & AccountEnrollmentRepository,
  subject: string,
  email: string,
  password: string,
  used: boolean;
let login: AccountLoginUseCase,
  read: GetAccountSessionUseCase,
  confirm: ConfirmAccountEmailUseCase,
  complete: CompleteAccountPasswordUseCase;
const redirect = "https://app.example.invalid/auth/confirm";
function tokens(): AccountTokens {
  return {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresIn: 3600,
    identity: { subject, email, emailConfirmed: true },
  };
}
beforeEach(async () => {
  h = await harness();
  accounts = new D1LocalAccountRepository(h.db);
  sessions = new D1AccountSessionRepository(h.db);
  lifecycle = new D1AccountLifecycleRepository(h.db);
  codec = new AccountCredentialCodec(
    "synthetic-account-secret-at-least-32-characters",
  );
  normal = browser();
  setup = browser();
  subject = uuid();
  email = "invited@example.invalid";
  password = "synthetic-own-password";
  used = false;
  provider = {
    login: vi.fn(async (credentials) => {
      if (credentials.email !== email || credentials.password !== password)
        throwBusinessError({
          code: "INVALID_CREDENTIALS",
          category: "unauthenticated",
        });
      return tokens();
    }),
    refresh: vi.fn(async () => ({
      ...tokens(),
      refreshToken: "rotated-synthetic",
    })),
    identify: vi.fn(async () => tokens().identity),
    invite: vi.fn(async (value) => {
      email = value;
      return { ...tokens().identity, emailConfirmed: false };
    }),
    recover: vi.fn(async () => {}),
    verifyEmail: vi.fn(async () => {
      if (used)
        throwBusinessError({
          code: "ACCOUNT_LINK_INVALID",
          category: "unauthenticated",
        });
      used = true;
      return tokens();
    }),
    setPassword: vi.fn(async (_token, value) => {
      password = value;
      return tokens().identity;
    }),
  };
  login = new AccountLoginUseCase(provider, accounts, sessions, codec, normal);
  read = new GetAccountSessionUseCase(
    provider,
    accounts,
    sessions,
    codec,
    normal,
  );
  confirm = new ConfirmAccountEmailUseCase(
    accounts,
    lifecycle,
    provider,
    codec,
    setup,
  );
  complete = new CompleteAccountPasswordUseCase(
    accounts,
    lifecycle,
    provider,
    codec,
    setup,
    login,
  );
});
afterEach(async () => {
  await h?.close();
});
async function invite(boxes: string[] = []) {
  await new InviteLocalAccountUseCase(
    accounts,
    lifecycle,
    provider,
    redirect,
  ).execute(h.actor, {
    email,
    role: boxes.length ? "finance" : "operator",
    cashBoxIds: boxes,
    cashBoxWriteIds: boxes,
  });
  return (await accounts.findByEmail(email))!;
}
async function activate(boxes: string[] = []) {
  await invite(boxes);
  await confirm.execute({ tokenHash: "synthetic-hash", type: "invite" });
  await complete.execute({
    fullName: "Pessoa convidada",
    password,
    confirmation: password,
  });
  return (await read.execute())!;
}
async function imported() {
  const a = (await accounts.reserveImported({
    externalUserId: 42,
    name: "Pessoa importada",
    email,
    now: new Date().toISOString(),
  }))!;
  await accounts.bindSubject(a.id, subject);
  await h.db
    .update(localAccounts)
    .set({ state: "active", activatedAt: new Date().toISOString() })
    .where(eq(localAccounts.id, a.id));
  await login.execute({ gmail: email, senha: password });
  return a;
}
describe("autenticação própria e permissões locais", () => {
  it("cancelar convite exclui a conta pendente, mas não uma conta já ativada", async () => {
    const account = await invite();
    const cancel = new CancelAccountInvitationUseCase(
      accounts,
      new DeleteLocalAccountUseCase(accounts),
    );
    await cancel.execute(h.actor, { id: account.id, version: account.version });
    expect(await accounts.findById(account.id)).toMatchObject({
      state: "blocked",
      deletedAt: expect.any(String),
    });
    expect((await accounts.list("", 1, 15)).total).toBe(0);
    expect(
      await lifecycle.pendingInvitation(
        account.id,
        Math.floor(Date.now() / 1000),
      ),
    ).toBeNull();
    await activate();
    const active = (await accounts.findById(account.id))!;
    await expect(
      cancel.execute(h.actor, { id: active.id, version: active.version }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_CHANGED" } });
    expect(await accounts.findById(active.id)).toMatchObject({
      state: "active",
      deletedAt: null,
    });
  });

  it("exclui e reativa o mesmo ID com novo nome sem alterar movimentações anteriores", async () => {
    const box = await h.box();
    const actor = await activate([box.id]);
    const account = (await accounts.findByEmail(email))!;
    const movement = await new CreateMovementUseCase(
      h.movements,
      h.boxes,
      h.receipts,
    ).execute(actor, movementInput(box.id));
    const before = await h.movements.find(movement.id);
    const oldCredential = (await normal.read())!;
    await new DeleteLocalAccountUseCase(accounts).execute(h.actor, {
      id: account.id,
      version: account.version,
    });
    expect(await read.execute()).toBeNull();
    expect(
      (await sessions.find(await codec.hash(oldCredential)))?.revokedAt,
    ).not.toBeNull();
    expect((await accounts.list("", 1, 15)).items).toHaveLength(0);
    await expect(
      login.execute({ gmail: email, senha: password }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_ACCESS_DENIED" } });
    const restored = await invite();
    expect(restored).toMatchObject({
      id: account.id,
      authorId: actor.user.id,
      state: "pending",
      cashBoxIds: [],
      requiresActivationName: true,
    });
    used = false;
    await confirm.execute({
      tokenHash: "synthetic-new-hash",
      type: "recovery",
    });
    await complete.execute({
      fullName: "Novo nome",
      password,
      confirmation: password,
    });
    expect((await read.execute())?.user).toMatchObject({
      id: actor.user.id,
      name: "Novo nome",
    });
    expect(await h.movements.find(movement.id)).toEqual(before);
    expect(await accounts.findByEmail(email)).toMatchObject({
      id: account.id,
      deletedAt: null,
      state: "active",
    });
    const audit = await h.d1
      .prepare(
        "SELECT before_json,after_json FROM local_account_audit WHERE account_id=? AND json_extract(after_json,'$.deletedAt') IS NOT NULL",
      )
      .bind(account.id)
      .first();
    expect(audit).not.toBeNull();
  });
  it("exclusão exige administrador e versão atual; invalida prova pendente", async () => {
    const a = await invite();
    await confirm.execute({ tokenHash: "synthetic-hash", type: "invite" });
    const ticketHash = await codec.hash((await setup.read())!);
    const deletion = new DeleteLocalAccountUseCase(accounts);
    await expect(
      deletion.execute(
        { ...h.actor, role: "finance" },
        { id: a.id, version: a.version },
      ),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    await expect(
      deletion.execute(h.actor, { id: a.id, version: a.version + 1 }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_CHANGED" } });
    await deletion.execute(h.actor, { id: a.id, version: a.version });
    expect(
      await lifecycle.ticket(ticketHash, Math.floor(Date.now() / 1000)),
    ).toBeNull();
    expect(
      await lifecycle.pendingInvitation(a.id, Math.floor(Date.now() / 1000)),
    ).toBeNull();
    await expect(
      complete.execute({
        fullName: "Novo nome",
        password,
        confirmation: password,
      }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_LINK_INVALID" } });
    expect(
      await accounts.manage(
        {
          id: a.id,
          version: a.version + 1,
          role: "admin",
          blocked: false,
          cashBoxIds: [],
        },
        h.actor.user.id,
        new Date().toISOString(),
      ),
    ).toBe(false);
  });
  it("reativação de importado mantém autoria positiva e permite informar o nome", async () => {
    const a = await imported();
    await new DeleteLocalAccountUseCase(accounts).execute(h.actor, {
      id: a.id,
      version: a.version,
    });
    await invite();
    await confirm.execute({
      tokenHash: "synthetic-new-hash",
      type: "recovery",
    });
    await complete.execute({
      fullName: "Nome da reativação",
      password,
      confirmation: password,
    });
    expect((await read.execute())?.user).toMatchObject({
      id: 42,
      name: "Nome da reativação",
    });
    expect(await accounts.findByEmail(email)).toMatchObject({
      id: a.id,
      externalUserId: 42,
      state: "active",
    });
  });

  it("convite comprova e-mail uma vez, define senha própria e emite somente cookie opaco", async () => {
    const a = await invite();
    await expect(
      login.execute({ gmail: email, senha: password }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_ACCESS_DENIED" } });
    await confirm.execute({ tokenHash: "synthetic-hash", type: "invite" });
    expect(await normal.read()).toBeNull();
    expect(await setup.read()).toMatch(/^[\w-]{43}$/);
    await expect(
      complete.execute({ password, confirmation: password }),
    ).rejects.toMatchObject({
      details: {
        code: "INVALID_LOGIN_INPUT",
        issues: { fullName: "INVALID_ACCOUNT_NAME" },
      },
    });
    expect(provider.setPassword).not.toHaveBeenCalled();
    expect(await accounts.findById(a.id)).toMatchObject({
      state: "pending",
      name: email,
    });
    await complete.execute({
      fullName: "  Pessoa convidada  ",
      password: "new-synthetic-own",
      confirmation: "new-synthetic-own",
    });
    const s = await read.execute();
    expect(s).toMatchObject({
      role: "operator",
      user: { id: -a.id, email, name: "Pessoa convidada" },
      cashBoxIds: [],
    });
    expect(await setup.read()).toBeNull();
    const stored = await sessions.find(
      await codec.hash((await normal.read())!),
    );
    expect(stored?.encryptedTokens).not.toContain("synthetic-access");
    expect(JSON.stringify(stored)).not.toContain("new-synthetic-own");
    await expect(
      confirm.execute({ tokenHash: "synthetic-hash", type: "invite" }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_LINK_INVALID" } });
  });
  it("financeiro consulta e altera somente os caixas concedidos, inclusive correções entre caixas", async () => {
    const own = await h.box("Permitido"),
      other = await h.box("Consulta"),
      s = await activate([own.id]);
    expect(
      (
        await new ListCashBoxesUseCase(h.boxes).execute(s, {
          query: "",
          page: 1,
        })
      ).items.map((b) => b.id),
    ).toEqual([own.id]);
    await expect(
      new CreateCashBoxUseCase(h.boxes).execute(s, {
        name: "Proibido",
        description: "",
      }),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    const create = new CreateMovementUseCase(h.movements, h.boxes, h.receipts),
      entry = await create.execute(s, movementInput(own.id, "20"));
    await expect(
      create.execute(s, movementInput(other.id, "20")),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    await expect(
      new UpdateMovementUseCase(h.movements, h.boxes, h.receipts).execute(
        s,
        {
          ...movementInput(other.id, "20"),
          id: entry.id,
          version: entry.version,
        },
        [],
      ),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
    expect((await h.boxes.find(own.id))?.balanceCents).toBe(2000);
    expect((await h.boxes.find(other.id))?.balanceCents).toBe(0);
    await expect(
      new ManageLocalAccountUseCase(accounts).execute(s, {
        id: s.accountId,
        version: 1,
        role: "admin",
        blocked: false,
        cashBoxIds: [],
      }),
    ).rejects.toMatchObject({ details: { code: "ACCESS_DENIED" } });
  });
  it("bloqueio e permissões são relidos no D1 e não se restauram pelo login", async () => {
    const own = await h.box(),
      s = await activate([own.id]),
      a = (await accounts.findById(s.accountId!))!;
    await new ManageLocalAccountUseCase(accounts).execute(h.actor, {
      id: a.id,
      version: a.version,
      role: "operator",
      blocked: true,
      cashBoxIds: [],
    });
    expect(await read.execute()).toBeNull();
    await expect(
      login.execute({ gmail: email, senha: password }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_ACCESS_DENIED" } });
    expect(await accounts.findById(a.id)).toMatchObject({
      state: "blocked",
      cashBoxIds: [],
    });
  });
  it("convite cancelado também invalida ticket já confirmado, sem ativação parcial", async () => {
    const a = await invite();
    await confirm.execute({ tokenHash: "proof", type: "invite" });
    const invitation = (await lifecycle.pendingInvitation(
      a.id,
      Math.floor(Date.now() / 1000),
    ))!;
    await lifecycle.cancelInvitation(
      invitation.id,
      Math.floor(Date.now() / 1000),
    );
    expect(
      await lifecycle.consumeTicket(
        await codec.hash((await setup.read())!),
        Math.floor(Date.now() / 1000),
        "Nome não autorizado",
      ),
    ).toBe(false);
    expect(await accounts.findById(a.id)).toMatchObject({
      state: "pending",
      name: email,
    });
    await expect(
      complete.execute({ password, confirmation: password }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_LINK_INVALID" } });
    expect(provider.setPassword).not.toHaveBeenCalled();
    expect(await accounts.findById(a.id)).toMatchObject({ state: "pending" });
  });
  it("sessão renova durante uso e encerra exatamente após doze horas sem uso", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.now());
    await imported();
    const value = (await normal.read())!,
      stored = (await sessions.find(await codec.hash(value)))!,
      now = Math.floor(Date.now() / 1000);
    await h.db
      .update(accountSessions)
      .set({
        createdAt: now - 43200,
        lastActiveAt: now - 43199,
        providerExpiresAt: now + 60,
      })
      .where(eq(accountSessions.id, stored.id));
    expect(await read.execute()).not.toBeNull();
    expect(
      (await sessions.find(await codec.hash(value)))?.lastActiveAt,
    ).toBeGreaterThanOrEqual(now);
    await h.db
      .update(accountSessions)
      .set({ lastActiveAt: now - 43200 })
      .where(eq(accountSessions.id, stored.id));
    expect(await read.execute()).toBeNull();
  });
  it("renovação concorrente chama provedor uma vez e preserva o refresh token rotacionado", async () => {
    await imported();
    const value = (await normal.read())!,
      stored = (await sessions.find(await codec.hash(value)))!;
    await h.db
      .update(accountSessions)
      .set({ providerExpiresAt: Math.floor(Date.now() / 1000) - 1 })
      .where(eq(accountSessions.id, stored.id));
    const result = await Promise.all([read.execute(), read.execute()]);
    expect(result.every(Boolean)).toBe(true);
    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(
      (
        await codec.open(
          (await sessions.find(await codec.hash(value)))!.encryptedTokens,
        )
      ).refreshToken,
    ).toBe("rotated-synthetic");
  });
  it("recuperação troca senha e revoga sessões anteriores; logout revoga no servidor", async () => {
    await imported();
    const oldCredential = (await normal.read())!;
    await new RequestAccountRecoveryUseCase(
      accounts,
      provider,
      redirect,
    ).execute({ email });
    expect(provider.recover).toHaveBeenCalledWith(email, redirect);
    await confirm.execute({ tokenHash: "proof", type: "recovery" });
    await complete.execute({
      fullName: "Não deve substituir o nome",
      password: "reset-synthetic",
      confirmation: "reset-synthetic",
    });
    expect(
      (await sessions.find(await codec.hash(oldCredential)))?.revokedAt,
    ).not.toBeNull();
    expect(await read.execute()).not.toBeNull();
    expect((await read.execute())?.user.name).toBe("Pessoa importada");
    await new AccountLogoutUseCase(sessions, codec, normal).execute();
    expect(await normal.read()).toBeNull();
    expect(await read.execute()).toBeNull();
  });
  it("permissões concorrentes preservam uma única versão e auditam o estado final", async () => {
    const a = await imported(),
      current = (await accounts.findById(a.id))!,
      box = await h.box();
    const manage = new ManageLocalAccountUseCase(accounts),
      input = {
        id: a.id,
        version: current.version,
        role: "finance",
        blocked: false,
        cashBoxIds: [box.id],
      };
    const results = await Promise.allSettled([
      manage.execute(h.actor, input),
      manage.execute(h.actor, { ...input, cashBoxIds: [] }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await accounts.findById(a.id))?.version).toBe(current.version + 1);
    expect(
      (
        await h.d1
          .prepare(
            "SELECT count(*) AS total FROM local_account_audit WHERE account_id=?",
          )
          .bind(a.id)
          .first<{ total: number }>()
      )?.total,
    ).toBeGreaterThan(0);
  });
});

function unifiedEntry(request: typeof fetch) {
  const activation = new StartAccountActivationUseCase(
    new PrepareAccountActivationUseCase(
      new AuthApiRepository("https://legacy.example.invalid", request),
      new GetOwnProfileUseCase(
        new UserApiRepository("https://legacy.example.invalid", request),
      ),
      accounts,
    ),
    accounts,
    lifecycle,
    provider,
    redirect,
  );
  return new LoginOrActivateAccountUseCase(accounts, login, activation);
}
function legacyRequest() {
  const jwt = `e30.${Buffer.from(
    JSON.stringify({
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid": "42",
      status: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url")}.synthetic`;
  return vi.fn<typeof fetch>(async (url) =>
    Response.json(
      new URL(String(url)).pathname === "/api/Login"
        ? { status: true, jwtToken: jwt }
        : { id: 42, nome: "Pessoa importada", email },
    ),
  );
}
describe("entrada única com habilitação nos bastidores", () => {
  it("inicia a habilitação no próprio Entrar, preserva autoria e só cria sessão após prova/senha", async () => {
    const request = legacyRequest();
    const entry = unifiedEntry(request);
    await expect(
      entry.execute({ gmail: email, senha: " legacy password " }),
    ).resolves.toEqual({ kind: "email-confirmation", email });
    expect(request).toHaveBeenCalledTimes(2);
    expect(provider.login).not.toHaveBeenCalled();
    expect(await normal.read()).toBeNull();
    expect(await accounts.findByEmail(email)).toMatchObject({
      authorId: 42,
      state: "pending",
    });
    await confirm.execute({ tokenHash: "synthetic-hash", type: "invite" });
    await complete.execute({ password, confirmation: password });
    expect(await read.execute()).toMatchObject({ user: { id: 42 } });
  });
  it("conta ativada entra mesmo com API antiga indisponível, sem enviar a senha para ela", async () => {
    await imported();
    await normal.clear();
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("synthetic outage"));
    await expect(
      unifiedEntry(request).execute({ gmail: email, senha: password }),
    ).resolves.toEqual({ kind: "signed-in" });
    expect(request).not.toHaveBeenCalled();
    expect(await read.execute()).not.toBeNull();
  });
  it("senha própria incorreta não recorre à API antiga ou altera a conta", async () => {
    await imported();
    await normal.clear();
    const before = await accounts.findByEmail(email),
      request = legacyRequest();
    await expect(
      unifiedEntry(request).execute({ gmail: email, senha: "wrong" }),
    ).rejects.toMatchObject({ details: { code: "INVALID_CREDENTIALS" } });
    expect(request).not.toHaveBeenCalled();
    expect(await accounts.findByEmail(email)).toEqual(before);
    expect(await normal.read()).toBeNull();
  });
  it("bloqueio não é contornado pela verificação antiga", async () => {
    const a = await imported();
    await h.db
      .update(localAccounts)
      .set({ state: "blocked" })
      .where(eq(localAccounts.id, a.id));
    const request = legacyRequest();
    await expect(
      unifiedEntry(request).execute({ gmail: email, senha: password }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_ACCESS_DENIED" } });
    expect(request).not.toHaveBeenCalled();
    expect(await read.execute()).toBeNull();
  });
  it("convidado pendente não recebe habilitação externa nem novo convite ao tentar entrar", async () => {
    const a = await invite(),
      before = await lifecycle.pendingInvitation(
        a.id,
        Math.floor(Date.now() / 1000),
      );
    const request = legacyRequest();
    await expect(
      unifiedEntry(request).execute({ gmail: email, senha: password }),
    ).rejects.toMatchObject({ details: { code: "ACCOUNT_ACCESS_DENIED" } });
    expect(request).not.toHaveBeenCalled();
    expect(
      await lifecycle.pendingInvitation(a.id, Math.floor(Date.now() / 1000)),
    ).toEqual(before);
  });
  it("primeira habilitação sem API disponível falha sem criar conta ou sessão", async () => {
    const cause = new TypeError("synthetic outage"),
      request = vi.fn<typeof fetch>().mockRejectedValue(cause);
    await expect(
      unifiedEntry(request).execute({ gmail: email, senha: password }),
    ).rejects.toBe(cause);
    expect(await accounts.findByEmail(email)).toBeNull();
    expect(await normal.read()).toBeNull();
    expect(provider.login).not.toHaveBeenCalled();
  });
});
