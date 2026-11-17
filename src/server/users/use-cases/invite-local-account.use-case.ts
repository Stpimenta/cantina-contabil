import { checkAdminAccess } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { LocalAccountRepository } from "../repositories/local-account.repository";
import type { AccountLifecycleRepository } from "@/server/auth/repositories/account-lifecycle.repository";
import type { AccountEnrollmentRepository } from "@/server/auth/repositories/account-enrollment.repository";
import { ACCOUNT_INVITATION_SECONDS } from "@/server/auth/models/local-account-policy";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateInviteAccount } from "../inputs/manage-account.input";
export class InviteLocalAccountUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly lifecycle: AccountLifecycleRepository,
    private readonly enrollment: AccountEnrollmentRepository,
    private readonly redirectTo: string,
  ) {}
  async execute(session: Session | null, input: unknown) {
    const actor = checkAdminAccess(session),
      data = parseInput(validateInviteAccount(input)),
      now = Math.floor(Date.now() / 1000);
    let account = await this.accounts.findByEmail(data.email);
    if (account && account.state !== "pending")
      return throwBusinessError({
        code: "ACCOUNT_CHANGED",
        category: "conflict",
      });
    const existing = account;
    account =
      account ??
      (await this.accounts.reserveInvited(
        data.email,
        data.email,
        new Date().toISOString(),
      ));
    if (!account)
      return throwBusinessError({
        code: "ACCOUNT_CHANGED",
        category: "conflict",
      });
    if (
      !(await this.accounts.manage(
        {
          id: account.id,
          version: account.version,
          role: existing ? account.role : data.role,
          blocked: false,
          cashBoxIds: existing ? account.cashBoxIds : data.cashBoxIds,
          cashBoxWriteIds: existing
            ? account.cashBoxWriteIds
            : data.cashBoxWriteIds,
          eventIds: existing ? account.eventIds : data.eventIds,
          eventWriteIds: existing ? account.eventWriteIds : data.eventWriteIds,
        },
        actor.user.id,
        new Date().toISOString(),
      ))
    )
      return throwBusinessError({
        code: "ACCOUNT_CHANGED",
        category: "conflict",
      });
    await this.lifecycle.createInvitation({
      id: crypto.randomUUID(),
      accountId: account.id,
      createdAt: now,
      expiresAt: now + ACCOUNT_INVITATION_SECONDS,
      createdBy: actor.user.id,
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
  }
}
