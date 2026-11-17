import { parseInput } from "@/shared/validation/input";
import { validateLogin } from "../inputs/login.input";
import type { LocalAccountRepository } from "@/server/users/repositories/local-account.repository";
import type { AccountLoginUseCase } from "./account-login.use-case";
import type { StartAccountActivationUseCase } from "./start-account-activation.use-case";

// Established accounts never depend on or send their own password to the legacy API.
export class LoginOrActivateAccountUseCase {
  constructor(
    private readonly accounts: Pick<LocalAccountRepository, "findByEmail">,
    private readonly login: Pick<AccountLoginUseCase, "execute">,
    private readonly activation: Pick<StartAccountActivationUseCase, "execute">,
  ) {}
  async execute(
    input: unknown,
  ): Promise<
    { kind: "signed-in" } | { kind: "email-confirmation"; email: string }
  > {
    const credentials = parseInput(validateLogin(input));
    const account = await this.accounts.findByEmail(credentials.gmail);
    if (
      !account ||
      (account.state === "pending" && account.externalUserId !== null)
    ) {
      const result = await this.activation.execute(credentials);
      return { kind: "email-confirmation", email: result.email };
    }
    // Blocked accounts and invited users cannot fall back to legacy eligibility.
    await this.login.execute(credentials);
    return { kind: "signed-in" };
  }
}
