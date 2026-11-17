export interface AccountSession {
  id: string;
  accountId: number;
  credentialHash: string;
  encryptedTokens: string;
  providerExpiresAt: number;
  createdAt: number;
  lastActiveAt: number;
  refreshLeaseUntil: number;
  version: number;
  revokedAt: number | null;
}
