import { describe, expect, it, vi } from "vitest";
import { SupabaseAuthRepository } from "@/server/auth/infrastructure/supabase-auth.repository";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";

const user = {
  id: "ec23f39f-c805-48c1-8aad-929264d2d788",
  email: "synthetic@example.invalid",
  email_confirmed_at: "2026-11-15T12:00:00Z",
  user_metadata: { role: "admin", cashBoxes: ["untrusted"] },
};
const tokens = {
  access_token: "synthetic-access",
  refresh_token: "synthetic-refresh",
  token_type: "bearer",
  expires_in: 3600,
  user,
};

function harness(body: unknown = tokens, status = 200) {
  const request = vi.fn<typeof fetch>(async () =>
    Response.json(body, { status }),
  );
  const repository = new SupabaseAuthRepository(
    "https://auth.example.invalid",
    "synthetic-publishable-key",
    request,
  );
  return { repository, request };
}

describe("Supabase Auth com transporte controlado", () => {
  it("envia convite administrativo com retorno canônico e sem Bearer secreto", async () => {
    const request = vi.fn<typeof fetch>(async () => Response.json(user));
    const repository = new SupabaseAuthRepository(
      "https://auth.example.invalid",
      "public",
      request,
      "admin-secret",
    );
    expect(
      (
        await repository.invite(
          user.email,
          "http://localhost:5174/auth/confirm",
        )
      ).subject,
    ).toBe(user.id);
    const [url, options] = request.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("redirect_to")).toBe(
      "http://localhost:5174/auth/confirm",
    );
    expect(options?.headers).toMatchObject({ apikey: "admin-secret" });
    expect(options?.headers).not.toHaveProperty("Authorization");
  });
  it("vincula identidade já existente no provedor compartilhado somente por e-mail exato e envia prova", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error_code: "email_exists", code: 422 }, { status: 422 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          users: [
            {
              ...user,
              id: "ec23f39f-c805-48c1-8aad-929264d2d789",
              email: "other@example.invalid",
            },
            user,
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({}));
    const repository = new SupabaseAuthRepository(
      "https://auth.example.invalid",
      "public",
      request,
      "admin-secret",
    );
    expect(
      (
        await repository.invite(
          user.email,
          "http://localhost:5174/auth/confirm",
        )
      ).subject,
    ).toBe(user.id);
    expect(new URL(String(request.mock.calls[2][0])).pathname).toBe(
      "/auth/v1/recover",
    );
    expect(request).toHaveBeenCalledTimes(3);
  });
  it("recusa correspondência parcial de e-mail no provedor compartilhado", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error_code: "email_exists" }, { status: 422 }),
      )
      .mockResolvedValueOnce(
        Response.json({ users: [{ ...user, email: "prefix" + user.email }] }),
      );
    const repository = new SupabaseAuthRepository(
      "https://auth.example.invalid",
      "public",
      request,
      "admin-secret",
    );
    await expect(
      repository.invite(user.email, "http://localhost:5174/auth/confirm"),
    ).rejects.toBeInstanceOf(InfrastructureError);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("confirma prova e define senha sem normalizá-la", async () => {
    const h = harness();
    expect(
      (await h.repository.verifyEmail("synthetic-hash", "invite")).identity
        .subject,
    ).toBe(user.id);
    expect(JSON.parse(String(h.request.mock.calls[0][1]?.body))).toEqual({
      token_hash: "synthetic-hash",
      type: "invite",
    });
    h.request.mockResolvedValueOnce(Response.json(user));
    await h.repository.setPassword("synthetic-access", " own password ");
    expect(JSON.parse(String(h.request.mock.calls[1][1]?.body))).toEqual({
      password: " own password ",
    });
  });

  it("autentica sem transformar senha ou importar permissões dos metadados", async () => {
    const h = harness();
    const result = await h.repository.login({
      email: user.email,
      password: " own password ",
    });
    expect(result).toEqual({
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
      expiresIn: 3600,
      identity: { subject: user.id, email: user.email, emailConfirmed: true },
    });
    const [url, options] = h.request.mock.calls[0];
    expect(String(url)).toBe(
      "https://auth.example.invalid/auth/v1/token?grant_type=password",
    );
    expect(options).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "manual",
    });
    expect(JSON.parse(String(options?.body))).toEqual({
      email: user.email,
      password: " own password ",
    });
    expect(String(url)).not.toContain("password=");
  });

  it("devolve o refresh token novo sem guardar estado compartilhado", async () => {
    const h = harness({ ...tokens, refresh_token: "rotated-refresh" });
    expect((await h.repository.refresh("old-refresh")).refreshToken).toBe(
      "rotated-refresh",
    );
    const [url, options] = h.request.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("grant_type")).toBe(
      "refresh_token",
    );
    expect(JSON.parse(String(options?.body))).toEqual({
      refresh_token: "old-refresh",
    });
    expect(h.request).toHaveBeenCalledTimes(1);
  });

  it("confere a identidade no provedor sem confiar em JWT decodificado", async () => {
    const h = harness(user);
    expect(await h.repository.identify("opaque-access")).toEqual({
      subject: user.id,
      email: user.email,
      emailConfirmed: true,
    });
    const [url, options] = h.request.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/auth/v1/user");
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer opaque-access",
    });
  });

  it("preserva e-mail ainda não confirmado como identidade não confirmada", async () => {
    const h = harness({ ...user, email_confirmed_at: null });
    expect((await h.repository.identify("opaque-access")).emailConfirmed).toBe(
      false,
    );
  });

  it.each([
    ["password", "invalid_credentials", "INVALID_CREDENTIALS"],
    ["password", "email_not_confirmed", "LOGIN_ACCESS_DENIED"],
    ["refresh", "refresh_token_not_found", "SESSION_EXPIRED"],
    ["refresh", "refresh_token_already_used", "SESSION_EXPIRED"],
    ["refresh", "session_expired", "SESSION_EXPIRED"],
  ])(
    "traduz somente a falha conhecida %s/%s",
    async (operation, errorCode, code) => {
      const h = harness(
        { error_code: errorCode, code: 400, msg: "private provider message" },
        400,
      );
      const attempt =
        operation === "password"
          ? h.repository.login({ email: user.email, password: "synthetic" })
          : h.repository.refresh("synthetic");
      await expect(attempt).rejects.toMatchObject({ details: { code } });
      expect(h.request).toHaveBeenCalledTimes(1);
    },
  );

  it("aceita código textual legado de credenciais inválidas", async () => {
    const h = harness({ code: "invalid_credentials" }, 400);
    await expect(
      h.repository.login({ email: user.email, password: "synthetic" }),
    ).rejects.toMatchObject({ details: { code: "INVALID_CREDENTIALS" } });
  });

  it.each([
    { code: 400 },
    { error_code: "unknown_error", code: 400 },
    { error_code: "unknown_error", code: "invalid_credentials" },
  ])("não trata erro HTTP desconhecido como senha incorreta", async (body) => {
    const h = harness(body, 400);
    await expect(
      h.repository.login({ email: user.email, password: "synthetic" }),
    ).rejects.toBeInstanceOf(InfrastructureError);
  });

  it.each(["weak_password", "same_password"])(
    "preserva tratamento de senha %s com código HTTP numérico",
    async (errorCode) => {
      const h = harness({ error_code: errorCode, code: 422 }, 422);
      if (errorCode === "weak_password") {
        await expect(
          h.repository.setPassword("synthetic-access", "synthetic"),
        ).rejects.toMatchObject({ details: { code: "INVALID_LOGIN_INPUT" } });
      } else {
        h.request.mockResolvedValueOnce(
          Response.json({ error_code: errorCode, code: 422 }, { status: 422 }),
        );
        h.request.mockResolvedValueOnce(Response.json(user));
        expect(
          await h.repository.setPassword("synthetic-access", "synthetic"),
        ).toMatchObject({ subject: user.id });
      }
    },
  );

  it.each([302, 429, 500])(
    "rejeita HTTP %s sem repetir ou expor corpo",
    async (status) => {
      const h = harness({ msg: "private provider message" }, status);
      await expect(h.repository.refresh("synthetic")).rejects.toMatchObject({
        service: "supabase-auth",
        status,
      });
      expect(h.request).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { ...tokens, user: { ...user, id: "invalid" } },
    { ...tokens, expires_in: -1 },
    { ...tokens, access_token: "" },
    { ...tokens, token_type: "other" },
  ])("recusa contrato de tokens inválido", async (body) => {
    const h = harness(body);
    await expect(h.repository.refresh("synthetic")).rejects.toBeInstanceOf(
      InfrastructureError,
    );
  });

  it("propaga a falha original de rede sem retry", async () => {
    const cause = new TypeError("synthetic network failure");
    const request = vi.fn<typeof fetch>().mockRejectedValue(cause);
    const repository = new SupabaseAuthRepository(
      "https://auth.example.invalid",
      "synthetic-key",
      request,
    );
    await expect(repository.refresh("synthetic")).rejects.toBe(cause);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    "http://auth.example.invalid",
    "https://auth.example.invalid/other",
    "https://user:password@auth.example.invalid",
  ])("recusa configuração insegura %s antes de enviar credenciais", (url) => {
    const request = vi.fn<typeof fetch>();
    expect(
      () => new SupabaseAuthRepository(url, "synthetic-key", request),
    ).toThrow(InfrastructureError);
    expect(request).not.toHaveBeenCalled();
  });
});
