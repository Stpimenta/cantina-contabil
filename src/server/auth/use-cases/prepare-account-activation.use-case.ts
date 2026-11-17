import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AuthRepository } from "../repositories/auth.repository";
import { validateLogin } from "../inputs/login.input";
import { readExternalIdentity } from "../models/read-external-identity";
import { validateActivationProfile } from "../inputs/activation-profile.input";

// Validates initial eligibility only. It never creates a daily session, copies
// a password or updates permissions on an account that already exists.
export class PrepareAccountActivationUseCase {
  constructor(
    private readonly externalAuth: AuthRepository,
    private readonly profile: GetOwnProfileUseCase,
    private readonly accounts: LocalAccountRepository,
  ) {}

  async execute(input: unknown) {
    const credentials = parseInput(validateLogin(input));
    const token = await this.externalAuth.login(credentials);
    const identity = readExternalIdentity(token);
    const user = parseInput(
      validateActivationProfile(
        await this.profile.execute(identity.userId, token),
      ),
    );
    if (identity.expiresAt <= Math.floor(Date.now() / 1000))
      return throwBusinessError({
        code: "LOGIN_SESSION_EXPIRED",
        category: "unauthenticated",
      });
    const existing = await this.accounts.findByExternalUserId(user.id);
    const account =
      existing ??
      (await this.accounts.reserveImported({
        externalUserId: user.id,
        birthDate: user.birthDate,
        phoneCountry: user.phoneCountry,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        now: new Date().toISOString(),
      }));
    if (!account || account.state !== "pending")
      return throwBusinessError({
        code: "LOGIN_ACCESS_DENIED",
        category: "forbidden",
      });
    // Only an internal handoff to the confirmation flow; not an authenticated session.
    return { accountId: account.id, email: account.email };
  }
}
