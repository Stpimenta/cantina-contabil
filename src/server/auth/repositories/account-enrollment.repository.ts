import type { AccountIdentity } from "../models/account-identity.model";
import type { AccountTokens } from "../models/account-tokens.model";
export interface AccountEnrollmentRepository {
  invite(email: string, redirectTo: string): Promise<AccountIdentity>;
  recover(email: string, redirectTo: string): Promise<void>;
  verifyEmail(
    tokenHash: string,
    type: "invite" | "recovery",
  ): Promise<AccountTokens>;
  setPassword(accessToken: string, password: string): Promise<AccountIdentity>;
}
