import type { AccountSessionRepository } from "../repositories/account-session.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
export class AccountLogoutUseCase {
  constructor(
    private readonly sessions: AccountSessionRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: BrowserCredentialRepository,
  ) {}
  async execute() {
    const credential = await this.browser.read();
    if (credential && /^[A-Za-z0-9_-]{43}$/.test(credential)) {
      const current = await this.sessions.find(
        await this.codec.hash(credential),
      );
      if (current)
        await this.sessions.revoke(current.id, Math.floor(Date.now() / 1000));
    }
    await this.browser.clear();
  }
}
