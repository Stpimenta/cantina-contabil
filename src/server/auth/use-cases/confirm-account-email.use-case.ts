import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateEmailProof } from "../inputs/account-enrollment.input";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountLifecycleRepository } from "../repositories/account-lifecycle.repository";
import type { AccountEnrollmentRepository } from "../repositories/account-enrollment.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
export class ConfirmAccountEmailUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly lifecycle: AccountLifecycleRepository,
    private readonly enrollment: AccountEnrollmentRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: BrowserCredentialRepository,
  ) {}
  async execute(input: unknown) {
    const data = parseInput(validateEmailProof(input)),
      tokens = await this.enrollment.verifyEmail(data.tokenHash, data.type);
    const account = await this.accounts.findBySubject(tokens.identity.subject),
      now = Math.floor(Date.now() / 1000);
    if (
      !account ||
      account.state === "blocked" ||
      !tokens.identity.emailConfirmed ||
      account.email.toLowerCase() !== tokens.identity.email.toLowerCase()
    )
      return throwBusinessError({
        code: "ACCOUNT_LINK_INVALID",
        category: "unauthenticated",
      });
    const invitation =
      account.state === "pending"
        ? await this.lifecycle.pendingInvitation(account.id, now)
        : null;
    if (
      (account.state === "pending" && !invitation) ||
      (account.state === "active" && data.type !== "recovery")
    )
      return throwBusinessError({
        code: "ACCOUNT_LINK_INVALID",
        category: "unauthenticated",
      });
    const credential = this.codec.generate();
    await this.lifecycle.createTicket({
      credentialHash: await this.codec.hash(credential),
      accountId: account.id,
      invitationId: invitation?.id ?? null,
      purpose: invitation ? "invite" : "recovery",
      encryptedTokens: await this.codec.seal(tokens),
      expiresAt: Math.min(
        now + tokens.expiresIn,
        invitation?.expiresAt ?? Number.MAX_SAFE_INTEGER,
      ),
      consumedAt: null,
    });
    await this.browser.write(credential);
  }
}
