import { checkAdminAccess } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { LocalAccountRepository } from "../repositories/local-account.repository";
import type { AccountLifecycleRepository } from "@/server/auth/repositories/account-lifecycle.repository";
import { parseInput } from "@/shared/validation/input";
import { validateManageAccount } from "../inputs/manage-account.input";
export class CancelAccountInvitationUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly lifecycle: AccountLifecycleRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAdminAccess(session);
    const { id } = parseInput(validateManageAccount(input));
    const invitation = await this.lifecycle.pendingInvitation(
      id,
      Math.floor(Date.now() / 1000),
    );
    if (invitation)
      await this.lifecycle.cancelInvitation(
        invitation.id,
        Math.floor(Date.now() / 1000),
      );
  }
}
