import type { AccountInvitation } from "../models/account-invitation.model";
import type { AccountSetupTicket } from "../models/account-setup-ticket.model";
export interface AccountLifecycleRepository {
  createInvitation(invitation: AccountInvitation): Promise<void>;
  latestInvitation(accountId: number): Promise<AccountInvitation | null>;
  pendingInvitation(
    accountId: number,
    now: number,
  ): Promise<AccountInvitation | null>;
  cancelInvitation(id: string, now: number): Promise<void>;
  createTicket(ticket: AccountSetupTicket): Promise<void>;
  ticket(hash: string, now: number): Promise<AccountSetupTicket | null>;
  consumeTicket(hash: string, now: number, fullName?: string): Promise<boolean>;
}
