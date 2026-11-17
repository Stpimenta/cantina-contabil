import type { AccountLifecycleRepository } from "../repositories/account-lifecycle.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
export class GetAccountSetupUseCase {
  constructor(
    private readonly lifecycle: AccountLifecycleRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: BrowserCredentialRepository,
  ) {}
  async execute() {
    const credential = await this.browser.read();
    return !!(
      credential &&
      /^[A-Za-z0-9_-]{43}$/.test(credential) &&
      (await this.lifecycle.ticket(
        await this.codec.hash(credential),
        Math.floor(Date.now() / 1000),
      ))
    );
  }
}
