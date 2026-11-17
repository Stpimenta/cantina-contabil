import type { AccountIdentity } from "./account-identity.model";

// Server-only values: never return these through a Server Action result.
export interface AccountTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  identity: AccountIdentity;
}
