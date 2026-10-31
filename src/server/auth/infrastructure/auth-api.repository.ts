import { loginResponseSchema, loginTokenSchema } from "./login-response.schema";
import { throwBusinessError } from "@/shared/errors/business-error";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
import type {
  AuthRepository,
  Credentials,
} from "../repositories/auth.repository";
export class AuthApiRepository implements AuthRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly request: typeof fetch = fetch,
  ) {}
  async login(credentials: Credentials): Promise<string> {
    const response = await this.request(new URL("/api/Login", this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      // Reject redirects without forwarding credentials.
      redirect: "manual",
    });
    if (response.status === 401)
      throwBusinessError({
        code: "INVALID_CREDENTIALS",
        category: "unauthenticated",
      });
    if (!response.ok)
      throw new InfrastructureError(
        "Serviço de login retornou uma falha",
        "auth-api",
        response.status,
        {
          details: {
            source: "src/server/auth/infrastructure/auth-api.repository.ts",
            endpoint: "/api/Login",
            method: "POST",
          },
        },
      );
    const body: unknown = await response.json();
    const result = loginResponseSchema.safeParse(body);
    if (!result.success) {
      throw new InfrastructureError(
        "Contrato de login inválido",
        "auth-api",
        response.status,
        {
          details: {
            source: "src/server/auth/infrastructure/auth-api.repository.ts",
            endpoint: "/api/Login",
            method: "POST",
          },
        },
      );
    }
    if (!result.data.status)
      throwBusinessError({
        code: "INVALID_CREDENTIALS",
        category: "unauthenticated",
      });
    const token = loginTokenSchema.safeParse(result.data.jwtToken);
    if (!token.success) {
      throw new InfrastructureError(
        "Token ausente na resposta de login",
        "auth-api",
        response.status,
        {
          details: {
            source: "src/server/auth/infrastructure/auth-api.repository.ts",
            endpoint: "/api/Login",
            method: "POST",
          },
        },
      );
    }
    return token.data;
  }
}
