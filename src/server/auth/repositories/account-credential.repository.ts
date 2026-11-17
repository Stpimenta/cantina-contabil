import type { AccountTokens } from "../models/account-tokens.model";
export interface AccountCredentialRepository {
  generate(): string;
  hash(value: string): Promise<string>;
  seal(value: AccountTokens): Promise<string>;
  open(value: string): Promise<AccountTokens>;
}
