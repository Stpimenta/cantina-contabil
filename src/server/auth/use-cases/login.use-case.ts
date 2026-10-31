import { SESSION_DURATION_SECONDS } from "../models/session-rules";
import { parseInput } from "@/shared/validation/input";
import { validateLogin } from "../inputs/login.input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import type { AuthRepository } from "../repositories/auth.repository";
import type { SessionRepository } from "../repositories/session.repository";
import { readExternalIdentity } from "../models/read-external-identity";
export class LoginUseCase {
  constructor(
    private readonly auth: AuthRepository,
    private readonly profile: GetOwnProfileUseCase,
    private readonly sessions: SessionRepository,
  ) {}
  async execute(input: unknown): Promise<void> {
    const credentials = parseInput(validateLogin(input));
    const auth = await this.auth.login(credentials);
    const identity = readExternalIdentity(auth);
    const user = await this.profile.execute(identity.userId, auth);
    const issuedAt = Math.floor(Date.now() / 1000);
    if (identity.expiresAt <= issuedAt)
      throwBusinessError({
        code: "LOGIN_SESSION_EXPIRED",
        category: "unauthenticated",
      });
    await this.sessions.create({
      user,
      role: identity.role,
      issuedAt,
      expiresAt: Math.min(
        identity.expiresAt,
        issuedAt + SESSION_DURATION_SECONDS,
      ),
    });
  }
}
