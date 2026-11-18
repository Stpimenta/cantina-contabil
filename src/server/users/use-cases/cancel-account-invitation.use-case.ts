import { checkAdminAccess } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { LocalAccountRepository } from "../repositories/local-account.repository";
import type { DeleteLocalAccountUseCase } from "./delete-local-account.use-case";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateDeleteAccount } from "../inputs/manage-account.input";

export class CancelAccountInvitationUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly deletion: Pick<DeleteLocalAccountUseCase, "execute">,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAdminAccess(session);
    const data = parseInput(validateDeleteAccount(input));
    const account = await this.accounts.findById(data.id);
    if (
      !account ||
      account.state !== "pending" ||
      account.deletedAt ||
      account.version !== data.version
    )
      return throwBusinessError({
        code: "ACCOUNT_CHANGED",
        category: "conflict",
      });
    await this.deletion.execute(session, data);
  }
}
