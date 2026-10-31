import { describe, expect, it, vi } from "vitest";
import { AuthApiRepository } from "@/server/auth/infrastructure/auth-api.repository";
import { UserApiRepository } from "@/server/users/infrastructure/user-api.repository";
import { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import { LoginUseCase } from "@/server/auth/use-cases/login.use-case";
import type { SessionRepository } from "@/server/auth/repositories/session.repository";
import type { Session } from "@/server/auth/models/session.model";
import { signSession, verifySession } from "@/server/auth/infrastructure/session-codec";

const credentials = { gmail: "teste@example.invalid", senha: "senha-sintetica" };
const profile = { id: 1, nome: "Pessoa sintética", email: "teste@example.invalid" };
const now = Date.UTC(2026, 9, 30, 12);
function token(status = "tesouraria", exp = Math.floor(now / 1000) + 10000) {
  return `e30.${Buffer.from(JSON.stringify({ "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid": "1", exp, status })).toString("base64url")}.sintetico`;
}
function loginHarness(loginBody: unknown = { status: true, jwtToken: token() }, profileBody: unknown = profile, status = 200) {
  let cookie: string | null = null;
  const secret = "somente-testes-segredo-sintetico-123456789";
  const sessions: SessionRepository = {
    async create(value) { cookie = await signSession(value, secret); },
    async read() { return cookie ? verifySession(cookie, secret, now) : null; },
    async destroy() { cookie = null; },
  };
  const request = vi.fn<typeof fetch>(async (url) => {
    const login = new URL(String(url)).pathname === "/api/Login";
    return Response.json(login ? loginBody : profileBody, { status: login ? status : 200 });
  });
  const useCase = new LoginUseCase(new AuthApiRepository("https://auth.example.invalid", request), new GetOwnProfileUseCase(new UserApiRepository("https://auth.example.invalid", request)), sessions);
  return { useCase, sessions, request };
}
describe("login com contratos externos controlados", () => {
  it("integra login, perfil e sessão assinada com limite de duas horas", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    const h = loginHarness(); await h.useCase.execute(credentials);
    expect(await h.sessions.read()).toMatchObject({ user: { id: 1, name: profile.nome }, role: "tesouraria", issuedAt: now / 1000, expiresAt: now / 1000 + 7200 });
    expect(h.request).toHaveBeenCalledTimes(2);
    for (const [, options] of h.request.mock.calls) expect(options).toMatchObject({ redirect: "manual", cache: "no-store" });
  });
  it("limita sessão também à expiração externa", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    const h = loginHarness({ status: true, jwtToken: token("admin", now / 1000 + 60) }); await h.useCase.execute(credentials);
    expect((await h.sessions.read())?.expiresAt).toBe(now / 1000 + 60);
  });
  it.each([
    ["credenciais recusadas", { status: false }, profile, 200, "INVALID_CREDENTIALS"],
    ["HTTP 401", {}, profile, 401, "INVALID_CREDENTIALS"],
    ["contrato inválido", { status: "true" }, profile, 200, null],
    ["token ausente", { status: true }, profile, 200, null],
    ["perfil divergente", { status: true, jwtToken: token() }, { ...profile, id: 2 }, 200, null],
    ["perfil inválido", { status: true, jwtToken: token() }, { ...profile, nome: "" }, 200, null],
    ["papel proibido", { status: true, jwtToken: token("visitante") }, profile, 200, "LOGIN_ACCESS_DENIED"],
    ["token expirado", { status: true, jwtToken: token("admin", now / 1000) }, profile, 200, "INVALID_AUTH_RESPONSE"],
    ["redirecionamento", {}, profile, 302, null],
  ])("%s não conclui sessão", async (_label, body, user, status, code) => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    const h = loginHarness(body, user, status);
    if (code) await expect(h.useCase.execute(credentials)).rejects.toMatchObject({ details: { code } });
    else await expect(h.useCase.execute(credentials)).rejects.toMatchObject({ name: "InfrastructureError" });
    expect(await h.sessions.read()).toBeNull();
  });
  it("falha de transporte preserva a causa original e não cria sessão", async () => {
    const cause = new TypeError("transporte sintético");
    const request = vi.fn<typeof fetch>().mockRejectedValue(cause);
    const create = vi.fn<(session: Session) => Promise<void>>();
    const login = new LoginUseCase(new AuthApiRepository("https://auth.example.invalid", request), new GetOwnProfileUseCase(new UserApiRepository("https://auth.example.invalid", request)), { create, read: async () => null, destroy: async () => {} });
    await expect(login.execute(credentials)).rejects.toBe(cause); expect(create).not.toHaveBeenCalled();
  });
});
