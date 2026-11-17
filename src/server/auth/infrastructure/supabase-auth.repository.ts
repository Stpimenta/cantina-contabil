import type { AccountEnrollmentRepository } from "../repositories/account-enrollment.repository";
import type { AccountAuthRepository } from "../repositories/account-auth.repository";
import type { AccountTokens } from "../models/account-tokens.model";
import type { AccountIdentity } from "../models/account-identity.model";
import { throwBusinessError } from "@/shared/errors/business-error";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import {
  supabaseUserListSchema,
  supabaseErrorSchema,
  supabaseIdentitySchema,
  supabaseTokensSchema,
} from "./supabase-auth.schema";

export class SupabaseAuthRepository
  implements AccountAuthRepository, AccountEnrollmentRepository
{
  private readonly origin: string;

  constructor(
    projectUrl: string,
    private readonly publishableKey: string,
    private readonly request: typeof fetch = fetch,
    private readonly secretKey?: string,
  ) {
    const url = new URL(projectUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !publishableKey.trim()
    )
      throw new InfrastructureError(
        "Configuração de autenticação inválida",
        "supabase-auth",
      );
    this.origin = url.origin;
  }

  async invite(email: string, redirectTo: string): Promise<AccountIdentity> {
    if (!this.secretKey)
      throw new InfrastructureError(
        "Chave administrativa ausente",
        "supabase-auth",
      );
    const response = await this.send(
      `/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
      "POST",
      { email },
      undefined,
      true,
    );
    if (!response.ok) {
      if (response.status === 400 || response.status === 422) {
        const error = supabaseErrorSchema.safeParse(await response.json());
        const code = error.success
          ? (error.data.error_code ?? error.data.code)
          : undefined;
        if (code === "email_exists" || code === "user_already_exists") {
          const existing = await this.findExistingIdentity(email);
          if (existing) {
            await this.recover(email, redirectTo);
            return existing;
          }
        }
      }
      throw this.failure(response.status);
    }
    const parsed = supabaseIdentitySchema.safeParse(await response.json());
    if (
      !parsed.success ||
      parsed.data.email.toLowerCase() !== email.toLowerCase()
    )
      throw this.failure(response.status);
    return this.identity(parsed.data);
  }
  private async findExistingIdentity(
    email: string,
  ): Promise<AccountIdentity | null> {
    // The provider is shared by local and production; bind an existing identity
    // only after authorized local enrollment, and still require its email proof.
    const seen = new Set<string>();
    for (let page = 1; ; page++) {
      const response = await this.send(
        `/auth/v1/admin/users?page=${page}&per_page=100&filter=${encodeURIComponent(email)}`,
        "GET",
        undefined,
        undefined,
        true,
      );
      if (!response.ok) throw this.failure(response.status);
      const parsed = supabaseUserListSchema.safeParse(await response.json());
      if (!parsed.success) throw this.failure(response.status);
      for (const user of parsed.data.users) {
        if (seen.has(user.id)) throw this.failure(response.status);
        seen.add(user.id);
        if (user.email?.toLowerCase() === email.toLowerCase()) {
          const identity = supabaseIdentitySchema.safeParse(user);
          if (!identity.success) throw this.failure(response.status);
          return this.identity(identity.data);
        }
      }
      if (parsed.data.users.length < 100) return null;
    }
  }
  async recover(email: string, redirectTo: string) {
    const response = await this.send(
      `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      "POST",
      { email },
    );
    if (!response.ok) throw this.failure(response.status);
  }
  async verifyEmail(
    tokenHash: string,
    type: "invite" | "recovery",
  ): Promise<AccountTokens> {
    const response = await this.send("/auth/v1/verify", "POST", {
      token_hash: tokenHash,
      type,
    });
    if (!response.ok) {
      if (
        response.status === 400 ||
        response.status === 403 ||
        response.status === 422
      )
        throwBusinessError({
          code: "ACCOUNT_LINK_INVALID",
          category: "unauthenticated",
        });
      throw this.failure(response.status);
    }
    const parsed = supabaseTokensSchema.safeParse(await response.json());
    if (!parsed.success) throw this.failure(response.status);
    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
      expiresIn: parsed.data.expires_in,
      identity: this.identity(parsed.data.user),
    };
  }
  async setPassword(
    accessToken: string,
    password: string,
  ): Promise<AccountIdentity> {
    const response = await this.send(
      "/auth/v1/user",
      "PUT",
      { password },
      accessToken,
    );
    if (!response.ok) {
      if (response.status === 400 || response.status === 422) {
        const parsed = supabaseErrorSchema.safeParse(await response.json());
        const code = parsed.success
          ? (parsed.data.error_code ?? parsed.data.code)
          : undefined;
        if (code === "weak_password")
          throwBusinessError({
            code: "INVALID_LOGIN_INPUT",
            category: "validation",
            issues: { password: "INVALID_PASSWORD" },
          });
        // Repeating the same password is safe after a lost D1 completion response.
        if (code === "same_password") return this.identify(accessToken);
      }
      if (response.status === 401 || response.status === 403)
        throwBusinessError({
          code: "ACCOUNT_LINK_INVALID",
          category: "unauthenticated",
        });
      throw this.failure(response.status);
    }
    const parsed = supabaseIdentitySchema.safeParse(await response.json());
    if (!parsed.success) throw this.failure(response.status);
    return this.identity(parsed.data);
  }

  login(credentials: {
    email: string;
    password: string;
  }): Promise<AccountTokens> {
    return this.exchange("password", credentials);
  }

  refresh(refreshToken: string): Promise<AccountTokens> {
    return this.exchange("refresh_token", { refresh_token: refreshToken });
  }

  async identify(accessToken: string): Promise<AccountIdentity> {
    const response = await this.send(
      "/auth/v1/user",
      "GET",
      undefined,
      accessToken,
    );
    if (response.status === 401 || response.status === 403)
      throwBusinessError({
        code: "SESSION_EXPIRED",
        category: "unauthenticated",
      });
    if (!response.ok) throw this.failure(response.status);
    const result = supabaseIdentitySchema.safeParse(await response.json());
    if (!result.success) throw this.failure(response.status);
    return this.identity(result.data);
  }

  private async exchange(
    grant: "password" | "refresh_token",
    payload: Record<string, string>,
  ): Promise<AccountTokens> {
    const response = await this.send(
      `/auth/v1/token?grant_type=${grant}`,
      "POST",
      payload,
    );
    if (!response.ok) {
      if (
        response.status === 400 ||
        response.status === 401 ||
        response.status === 422
      ) {
        const error = supabaseErrorSchema.safeParse(await response.json());
        const code = error.success
          ? (error.data.error_code ?? error.data.code)
          : undefined;
        if (grant === "password" && code === "invalid_credentials")
          throwBusinessError({
            code: "INVALID_CREDENTIALS",
            category: "unauthenticated",
          });
        if (grant === "password" && code === "email_not_confirmed")
          throwBusinessError({
            code: "LOGIN_ACCESS_DENIED",
            category: "forbidden",
          });
        if (
          grant === "refresh_token" &&
          [
            "refresh_token_not_found",
            "refresh_token_already_used",
            "session_not_found",
            "session_expired",
          ].includes(code ?? "")
        )
          throwBusinessError({
            code: "SESSION_EXPIRED",
            category: "unauthenticated",
          });
      }
      throw this.failure(response.status);
    }
    const result = supabaseTokensSchema.safeParse(await response.json());
    if (!result.success) throw this.failure(response.status);
    return {
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresIn: result.data.expires_in,
      identity: this.identity(result.data.user),
    };
  }

  private identity(user: {
    id: string;
    email: string;
    email_confirmed_at?: string | null;
  }): AccountIdentity {
    return {
      subject: user.id,
      email: user.email,
      emailConfirmed: Boolean(user.email_confirmed_at),
    };
  }

  private send(
    path: string,
    method: "POST" | "GET" | "PUT",
    payload?: Record<string, string>,
    accessToken?: string,
    admin = false,
  ) {
    return this.request(new URL(path, this.origin), {
      method,
      headers: {
        apikey: admin ? this.secretKey! : this.publishableKey,
        Accept: "application/json",
        ...(payload ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
  }

  private failure(status: number) {
    return new InfrastructureError(
      "Falha no contrato de autenticação",
      "supabase-auth",
      status,
    );
  }
}
