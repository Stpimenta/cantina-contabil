import type { PrepareAccountActivationUseCase } from "./prepare-account-activation.use-case";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountLifecycleRepository } from "../repositories/account-lifecycle.repository";
import type { AccountEnrollmentRepository } from "../repositories/account-enrollment.repository";
import { ACCOUNT_INVITATION_SECONDS } from "../models/local-account-policy";
import { throwBusinessError } from "@/shared/errors/business-error";
export class StartAccountActivationUseCase {
  constructor(
    private readonly prepare: PrepareAccountActivationUseCase,
    private readonly accounts: LocalAccountRepository,
    private readonly lifecycle: AccountLifecycleRepository,
    private readonly enrollment: AccountEnrollmentRepository,
    private readonly redirectTo: string,
  ) {}
  async execute(input: unknown) {
    const prepared = await this.prepare.execute(input),
      account = await this.accounts.findById(prepared.accountId);
    if (!account || account.state !== "pending")
      return throwBusinessError({
        code: "ACCOUNT_ACCESS_DENIED",
        category: "forbidden",
      });
    const now = Math.floor(Date.now() / 1000);
    await this.lifecycle.createInvitation({
      id: crypto.randomUUID(),
      accountId: account.id,
      createdAt: now,
      expiresAt: now + ACCOUNT_INVITATION_SECONDS,
      createdBy: account.authorId,
      cancelledAt: null,
      consumedAt: null,
    });
    if (account.authSubject)
      await this.enrollment.recover(account.email, this.redirectTo);
    else {
      const identity = await this.enrollment.invite(
        account.email,
        this.redirectTo,
      );
      if (!(await this.accounts.bindSubject(account.id, identity.subject)))
        return throwBusinessError({
          code: "ACCOUNT_CHANGED",
          category: "conflict",
        });
    }
    return { email: account.email };
  }
}
