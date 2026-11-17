import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1LocalAccountRepository } from "./infrastructure/d1-local-account.repository";
import { D1CashBoxRepository } from "@/server/cash-boxes/infrastructure/d1-cash-box.repository";
import { D1AccountLifecycleRepository } from "@/server/auth/infrastructure/d1-account-lifecycle.repository";
import { SupabaseAuthRepository } from "@/server/auth/infrastructure/supabase-auth.repository";
import { accountAuthConfig } from "@/server/auth/infrastructure/account-auth-config";
import { ListLocalAccountsUseCase } from "./use-cases/list-local-accounts.use-case";
import { ManageLocalAccountUseCase } from "./use-cases/manage-local-account.use-case";
import { InviteLocalAccountUseCase } from "./use-cases/invite-local-account.use-case";
import { CancelAccountInvitationUseCase } from "./use-cases/cancel-account-invitation.use-case";
export function createUsers() {
  const db = createDatabase(),
    accounts = new D1LocalAccountRepository(db),
    lifecycle = new D1AccountLifecycleRepository(db);
  return {
    list: new ListLocalAccountsUseCase(
      accounts,
      new D1CashBoxRepository(db),
      lifecycle,
    ),
    manage: new ManageLocalAccountUseCase(accounts),
    cancel: new CancelAccountInvitationUseCase(accounts, lifecycle),
    invite: {
      execute: async (
        ...args: Parameters<InviteLocalAccountUseCase["execute"]>
      ) => {
        const config = accountAuthConfig();
        return new InviteLocalAccountUseCase(
          accounts,
          lifecycle,
          new SupabaseAuthRepository(
            config.projectUrl,
            config.publishableKey,
            fetch,
            config.secretKey,
          ),
          config.redirectTo,
        ).execute(...args);
      },
    },
  };
}
