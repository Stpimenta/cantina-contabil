import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { UserApiRepository } from "@/server/users/infrastructure/user-api.repository";
import { GetOwnProfileUseCase } from "@/server/users/use-cases/get-own-profile.use-case";
import { D1LocalAccountRepository } from "@/server/users/infrastructure/d1-local-account.repository";
import { AuthApiRepository } from "./infrastructure/auth-api.repository";
import { CookieAccountCredentialRepository } from "./infrastructure/browser-credential.repository";
import { AccountCredentialCodec } from "./infrastructure/account-credential-codec";
import { D1AccountSessionRepository } from "./infrastructure/d1-account-session.repository";
import { D1AccountLifecycleRepository } from "./infrastructure/d1-account-lifecycle.repository";
import { SupabaseAuthRepository } from "./infrastructure/supabase-auth.repository";
import { accountAuthConfig } from "./infrastructure/account-auth-config";
import { AccountLoginUseCase } from "./use-cases/account-login.use-case";
import { GetAccountSessionUseCase } from "./use-cases/get-account-session.use-case";
import { AccountLogoutUseCase } from "./use-cases/account-logout.use-case";
import { PrepareAccountActivationUseCase } from "./use-cases/prepare-account-activation.use-case";
import { StartAccountActivationUseCase } from "./use-cases/start-account-activation.use-case";
import { ConfirmAccountEmailUseCase } from "./use-cases/confirm-account-email.use-case";
import { CompleteAccountPasswordUseCase } from "./use-cases/complete-account-password.use-case";
import { RequestAccountRecoveryUseCase } from "./use-cases/request-account-recovery.use-case";
import { GetAccountSetupUseCase } from "./use-cases/get-account-setup.use-case";
import { LoginOrActivateAccountUseCase } from "./use-cases/login-or-activate-account.use-case";
function build() {
  const config = accountAuthConfig(),
    db = createDatabase(),
    accounts = new D1LocalAccountRepository(db),
    sessions = new D1AccountSessionRepository(db),
    lifecycle = new D1AccountLifecycleRepository(db),
    codec = new AccountCredentialCodec(process.env.SESSION_SECRET ?? ""),
    browser = new CookieAccountCredentialRepository(),
    setup = new CookieAccountCredentialRepository("setup"),
    provider = new SupabaseAuthRepository(
      config.projectUrl,
      config.publishableKey,
      fetch,
      config.secretKey,
    );
  const baseUrl =
    process.env.AUTH_API_URL ?? "https://gestpvapi.ibpalavraviva.com.br";
  const login = new AccountLoginUseCase(
    provider,
    accounts,
    sessions,
    codec,
    browser,
  );
  const activate = new StartAccountActivationUseCase(
    new PrepareAccountActivationUseCase(
      new AuthApiRepository(baseUrl),
      new GetOwnProfileUseCase(new UserApiRepository(baseUrl)),
      accounts,
    ),
    accounts,
    lifecycle,
    provider,
    config.redirectTo,
  );
  return {
    login: new LoginOrActivateAccountUseCase(accounts, login, activate),
    getSession: new GetAccountSessionUseCase(
      provider,
      accounts,
      sessions,
      codec,
      browser,
    ),
    logout: new AccountLogoutUseCase(sessions, codec, browser),
    activate,
    confirm: new ConfirmAccountEmailUseCase(
      accounts,
      lifecycle,
      provider,
      codec,
      setup,
    ),
    password: new CompleteAccountPasswordUseCase(
      accounts,
      lifecycle,
      provider,
      codec,
      setup,
      login,
    ),
    recover: new RequestAccountRecoveryUseCase(
      accounts,
      provider,
      config.redirectTo,
    ),
    hasSetup: new GetAccountSetupUseCase(lifecycle, codec, setup, accounts),
  };
}
// Build lazily: requesting the login page without a cookie does not require D1
// or provider credentials, and build-time rendering cannot consume secrets.
export function createAuth() {
  return {
    login: { execute: (input: unknown) => build().login.execute(input) },
    getSession: {
      execute: async () =>
        (await new CookieAccountCredentialRepository().read())
          ? build().getSession.execute()
          : null,
    },
    logout: { execute: () => build().logout.execute() },
    activate: { execute: (input: unknown) => build().activate.execute(input) },
    confirm: { execute: (input: unknown) => build().confirm.execute(input) },
    password: { execute: (input: unknown) => build().password.execute(input) },
    recover: { execute: (input: unknown) => build().recover.execute(input) },
    hasSetup: {
      execute: async () =>
        (await new CookieAccountCredentialRepository("setup").read())
          ? build().hasSetup.execute()
          : false,
    },
  };
}
