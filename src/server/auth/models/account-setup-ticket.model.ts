export interface AccountSetupTicket {
  credentialHash: string;
  accountId: number;
  invitationId: string | null;
  purpose: "invite" | "recovery";
  encryptedTokens: string;
  expiresAt: number;
  consumedAt: number | null;
}
