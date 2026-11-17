import type { Session } from "../models/session.model";
import { ACCOUNT_IDLE_SECONDS } from "../models/local-account-policy";
import type { AccountAuthRepository } from "../repositories/account-auth.repository";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountSessionRepository } from "../repositories/account-session.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
import { BusinessError } from "@/shared/errors/business-error";
export class GetAccountSessionUseCase {
  constructor(
    private readonly auth: AccountAuthRepository,
    private readonly accounts: LocalAccountRepository,
    private readonly sessions: AccountSessionRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: Pick<BrowserCredentialRepository, "read">,
  ) {}
  async execute(): Promise<Session | null> {
    const credential = await this.browser.read();
    if (!credential || !/^[A-Za-z0-9_-]{43}$/.test(credential)) return null;
    const stored = await this.sessions.find(await this.codec.hash(credential)),
      now = Math.floor(Date.now() / 1000);
    if (
      !stored ||
      stored.revokedAt !== null ||
      stored.createdAt > now ||
      stored.lastActiveAt <= now - ACCOUNT_IDLE_SECONDS
    )
      return null;
    const account = await this.accounts.findById(stored.accountId);
    if (!account || account.state !== "active" || !account.authSubject)
      return null;
    if (
      stored.providerExpiresAt <= now &&
      (await this.sessions.claimRefresh(stored.id, stored.version, now))
    ) {
      // This catch has a specific purpose: release the refresh lease on failure
      // and revoke a session only for a recognized provider rejection.
      try {
        const payload = await this.codec.open(stored.encryptedTokens);
        const tokens = await this.auth.refresh(payload.refreshToken);
        if (
          tokens.identity.subject !== account.authSubject ||
          !tokens.identity.emailConfirmed ||
          tokens.identity.email.trim().toLowerCase() !==
            account.email.trim().toLowerCase()
        ) {
          await this.sessions.revoke(stored.id, now);
          return null;
        }
        if (
          !(await this.sessions.completeRefresh(
            stored.id,
            stored.version + 1,
            await this.codec.seal(tokens),
            now + tokens.expiresIn,
          ))
        )
          return null;
      } catch (cause) {
        await this.sessions.releaseRefresh(stored.id, stored.version + 1);
        if (
          cause instanceof BusinessError &&
          cause.details.code === "SESSION_EXPIRED"
        ) {
          await this.sessions.revoke(stored.id, now);
          return null;
        }
        throw cause;
      }
    }
    if (!(await this.sessions.touch(stored.id, now, ACCOUNT_IDLE_SECONDS)))
      return null;
    return {
      cashBoxWriteIds: account.cashBoxWriteIds,
      eventIds: account.eventIds,
      eventWriteIds: account.eventWriteIds,
      eventCashBoxIds: account.eventCashBoxIds,
      accountId: account.id,
      accountSessionId: stored.id,
      cashBoxIds: account.role === "admin" ? undefined : account.cashBoxIds,
      user: {
        id: account.authorId,
        name: account.name,
        email: account.email,
        birthDate: account.birthDate,
        phoneCountry: account.phoneCountry,
        phoneNumber: account.phoneNumber,
      },
      role: account.role,
      issuedAt: stored.createdAt,
      expiresAt: now + ACCOUNT_IDLE_SECONDS,
    };
  }
}
