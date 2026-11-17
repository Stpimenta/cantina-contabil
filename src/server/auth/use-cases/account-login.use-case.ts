import { validateLogin } from "../inputs/login.input";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { AccountAuthRepository } from "../repositories/account-auth.repository";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountSessionRepository } from "../repositories/account-session.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
export class AccountLoginUseCase {
  constructor(
    private readonly auth: AccountAuthRepository,
    private readonly accounts: LocalAccountRepository,
    private readonly sessions: AccountSessionRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: BrowserCredentialRepository,
  ) {}
  async execute(input: unknown) {
    const data = parseInput(validateLogin(input));
    const tokens = await this.auth.login({
      email: data.gmail,
      password: data.senha,
    });
    const account = await this.accounts.findBySubject(tokens.identity.subject);
    if (
      !account ||
      account.state !== "active" ||
      !tokens.identity.emailConfirmed ||
      account.email.trim().toLowerCase() !==
        tokens.identity.email.trim().toLowerCase()
    )
      return throwBusinessError({
        code: "ACCOUNT_ACCESS_DENIED",
        category: "forbidden",
      });
    const credential = this.codec.generate(),
      now = Math.floor(Date.now() / 1000);
    await this.sessions.create({
      id: crypto.randomUUID(),
      accountId: account.id,
      credentialHash: await this.codec.hash(credential),
      encryptedTokens: await this.codec.seal(tokens),
      providerExpiresAt: now + tokens.expiresIn,
      createdAt: now,
      lastActiveAt: now,
      refreshLeaseUntil: 0,
      version: 1,
      revokedAt: null,
    });
    await this.browser.write(credential);
  }
}
