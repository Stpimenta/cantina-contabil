import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateOwnPassword } from "../inputs/account-enrollment.input";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountLifecycleRepository } from "../repositories/account-lifecycle.repository";
import type { AccountEnrollmentRepository } from "../repositories/account-enrollment.repository";
import type { AccountCredentialRepository } from "../repositories/account-credential.repository";
import type { BrowserCredentialRepository } from "../repositories/browser-credential.repository";
import type { AccountLoginUseCase } from "./account-login.use-case";
export class CompleteAccountPasswordUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly lifecycle: AccountLifecycleRepository,
    private readonly enrollment: AccountEnrollmentRepository,
    private readonly codec: AccountCredentialRepository,
    private readonly browser: BrowserCredentialRepository,
    private readonly login: AccountLoginUseCase,
  ) {}
  async execute(input: unknown) {
    const credential = await this.browser.read();
    const invalid = () =>
      throwBusinessError({
        code: "ACCOUNT_LINK_INVALID",
        category: "unauthenticated",
      });
    if (!credential || !/^[A-Za-z0-9_-]{43}$/.test(credential))
      return invalid();
    const hash = await this.codec.hash(credential),
      now = Math.floor(Date.now() / 1000),
      ticket = await this.lifecycle.ticket(hash, now);
    if (!ticket) return invalid();
    const account = await this.accounts.findById(ticket.accountId);
    if (!account || account.state === "blocked") return invalid();
    if (
      ticket.purpose === "invite" &&
      (await this.lifecycle.pendingInvitation(account.id, now))?.id !==
        ticket.invitationId
    )
      return invalid();
    const requiresName =
      ticket.purpose === "invite" &&
      account.state === "pending" &&
      (account.externalUserId === null || !!account.requiresActivationName);
    const data = parseInput(validateOwnPassword(input, requiresName));
    const tokens = await this.codec.open(ticket.encryptedTokens),
      identity = await this.enrollment.setPassword(
        tokens.accessToken,
        data.password,
      );
    if (
      identity.subject !== account.authSubject ||
      !identity.emailConfirmed ||
      identity.email.toLowerCase() !== account.email.toLowerCase()
    )
      return invalid();
    if (
      !(await this.lifecycle.consumeTicket(
        hash,
        Math.floor(Date.now() / 1000),
        requiresName ? data.fullName : undefined,
      ))
    )
      return invalid();
    await this.browser.clear();
    await this.login.execute({ gmail: account.email, senha: data.password });
  }
}
