import type { AccountSession } from "../models/account-session.model";
export interface AccountSessionRepository {
  create(session: AccountSession): Promise<void>;
  find(credentialHash: string): Promise<AccountSession | null>;
  touch(id: string, now: number, idleSeconds: number): Promise<boolean>;
  claimRefresh(id: string, version: number, now: number): Promise<boolean>;
  completeRefresh(
    id: string,
    version: number,
    encryptedTokens: string,
    expiresAt: number,
  ): Promise<boolean>;
  releaseRefresh(id: string, version: number): Promise<void>;
  revoke(id: string, now: number): Promise<void>;
}
