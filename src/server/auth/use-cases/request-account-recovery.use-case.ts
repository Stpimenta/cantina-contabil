import { parseInput } from "@/shared/validation/input";
import { validateAccountEmail } from "../inputs/account-enrollment.input";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountEnrollmentRepository } from "../repositories/account-enrollment.repository";
export class RequestAccountRecoveryUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly enrollment: AccountEnrollmentRepository,
    private readonly redirectTo: string,
  ) {}
  async execute(input: unknown) {
    const { email } = parseInput(validateAccountEmail(input)),
      account = await this.accounts.findByEmail(email);
    // Same successful result for unknown, pending and blocked accounts.
    if (account?.state === "active")
      await this.enrollment.recover(account.email, this.redirectTo);
  }
}
