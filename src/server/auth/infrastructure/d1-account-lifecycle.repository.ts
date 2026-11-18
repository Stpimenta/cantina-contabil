import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import type { AccountLifecycleRepository } from "../repositories/account-lifecycle.repository";
import type { AccountInvitation } from "../models/account-invitation.model";
import type { AccountSetupTicket } from "../models/account-setup-ticket.model";
import { accountInvitations as invites } from "./account-invitation.schema";
import { accountSetupTickets as tickets } from "./account-setup-ticket.schema";
import { localAccounts } from "@/server/users/infrastructure/local-account.schema";
export class D1AccountLifecycleRepository implements AccountLifecycleRepository {
  constructor(private readonly db: Database) {}
  async createInvitation(value: AccountInvitation) {
    await this.db.batch([
      this.db
        .update(invites)
        .set({ cancelledAt: value.createdAt })
        .where(
          and(
            eq(invites.accountId, value.accountId),
            isNull(invites.cancelledAt),
            isNull(invites.consumedAt),
          ),
        ),
      this.db.insert(invites).values(value),
    ]);
  }
  async latestInvitation(accountId: number) {
    return (
      (await this.db
        .select()
        .from(invites)
        .where(eq(invites.accountId, accountId))
        .orderBy(
          sql`${invites.cancelledAt} IS NOT NULL`,
          desc(invites.createdAt),
          desc(invites.id),
        )
        .get()) ?? null
    );
  }
  async pendingInvitation(accountId: number, now: number) {
    return (
      (await this.db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.accountId, accountId),
            isNull(invites.cancelledAt),
            isNull(invites.consumedAt),
            gt(invites.expiresAt, now),
          ),
        )
        .get()) ?? null
    );
  }
  async cancelInvitation(id: string, now: number) {
    await this.db
      .update(invites)
      .set({ cancelledAt: now })
      .where(
        and(
          eq(invites.id, id),
          isNull(invites.cancelledAt),
          isNull(invites.consumedAt),
        ),
      )
      .run();
  }
  async createTicket(value: AccountSetupTicket) {
    await this.db.insert(tickets).values(value).run();
  }
  async ticket(hash: string, now: number) {
    return (
      (await this.db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.credentialHash, hash),
            isNull(tickets.consumedAt),
            gt(tickets.expiresAt, now),
          ),
        )
        .get()) ?? null
    );
  }
  async consumeTicket(hash: string, now: number, fullName?: string) {
    try {
      const consume = this.db
        .update(tickets)
        .set({ consumedAt: now })
        .where(
          and(
            eq(tickets.credentialHash, hash),
            isNull(tickets.consumedAt),
            gt(tickets.expiresAt, now),
          ),
        );
      if (fullName !== undefined) {
        // Name and activation share the transaction; invalid/cancelled proof rolls both back.
        const results = await this.db.batch([
          this.db
            .update(localAccounts)
            .set({
              name: fullName,
              requiresActivationName: false,
              version: sql`${localAccounts.version} + 1`,
              changedBy: sql`coalesce(${localAccounts.externalUserId}, -${localAccounts.id})`,
              updatedAt: new Date(now * 1000).toISOString(),
            })
            .where(
              and(
                eq(localAccounts.state, "pending"),
                isNull(localAccounts.deletedAt),
                sql`${localAccounts.id} IN (SELECT account_id FROM account_setup_tickets WHERE credential_hash=${hash} AND consumed_at IS NULL AND expires_at>${now} AND purpose='invite')`,
              ),
            ),
          consume,
        ]);
        return results[1].meta.changes > 0;
      }
      const result = await consume.run();
      return result.meta.changes > 0;
    } catch (cause) {
      if (hasDatabaseError(cause, "ACCOUNT_INVITATION_INVALID")) return false;
      throw cause;
    }
  }
}
