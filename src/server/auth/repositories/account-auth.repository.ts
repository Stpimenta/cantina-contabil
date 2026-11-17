import type { AccountIdentity } from "../models/account-identity.model";
import type { AccountTokens } from "../models/account-tokens.model";

export interface AccountAuthRepository {
  login(credentials: {
    email: string;
    password: string;
  }): Promise<AccountTokens>;
  refresh(refreshToken: string): Promise<AccountTokens>;
  identify(accessToken: string): Promise<AccountIdentity>;
}
