export interface AccountInvitation {
  id: string;
  accountId: number;
  createdAt: number;
  expiresAt: number;
  createdBy: number;
  cancelledAt: number | null;
  consumedAt: number | null;
}
