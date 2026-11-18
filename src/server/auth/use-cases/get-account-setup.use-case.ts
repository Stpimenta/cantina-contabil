import type { AccountLifecycleRepository } from "../repositories/account-lifecycle.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
export class GetAccountSetupUseCase {
  constructor(
    private readonly lifecycle: AccountLifecycleRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: BrowserCredentialRepository,
    private readonly accounts: LocalAccountRepository,
  ) {}
  async execute() {
    const credential = await this.browser.read();
    if (!credential || !/^[A-Za-z0-9_-]{43}$/.test(credential)) return null;
    const ticket = await this.lifecycle.ticket(
      await this.codec.hash(credential),
      Math.floor(Date.now() / 1000),
    );
    if (!ticket) return null;
    const account = await this.accounts.findById(ticket.accountId);
    if (!account || account.state === "blocked") return null;
    return {
      requiresName:
        ticket.purpose === "invite" &&
        account.state === "pending" &&
        (account.externalUserId === null || !!account.requiresActivationName),
    };
  }
}
