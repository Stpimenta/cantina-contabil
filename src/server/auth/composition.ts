import "server-only";
import { UserApiRepository } from "@/server/users/infrastructure/user-api.repository";
import { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import { AuthApiRepository } from "./infrastructure/auth-api.repository";
import { CookieSessionRepository } from "./infrastructure/cookie-session.repository";
import { LoginUseCase } from "./use-cases/login.use-case";
import { GetSessionUseCase } from "./use-cases/get-session.use-case";
import { LogoutUseCase } from "./use-cases/logout.use-case";

export function createAuth() {
  const baseUrl =
    process.env.AUTH_API_URL ?? "https://gestpvapi.ibpalavraviva.com.br";
  const sessions = new CookieSessionRepository();
  return {
    login: new LoginUseCase(
      new AuthApiRepository(baseUrl),
      new GetOwnProfileUseCase(new UserApiRepository(baseUrl)),
      sessions,
    ),
    getSession: new GetSessionUseCase(sessions),
    logout: new LogoutUseCase(sessions),
  };
}
