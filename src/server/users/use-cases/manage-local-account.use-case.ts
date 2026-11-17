import { checkAdminAccess } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { LocalAccountRepository } from "../repositories/local-account.repository";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateManageAccount } from "../inputs/manage-account.input";
export class ManageLocalAccountUseCase {
  constructor(private readonly accounts: LocalAccountRepository) {}
  async execute(session: Session | null, input: unknown) {
    const actor = checkAdminAccess(session),
      data = parseInput(validateManageAccount(input));
    if (
      !(await this.accounts.manage(
        data,
        actor.user.id,
        new Date().toISOString(),
      ))
    )
      return throwBusinessError({
        code: "ACCOUNT_CHANGED",
        category: "conflict",
      });
  }
}
