import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import type { AccountSession } from "../models/account-session.model";
import type { AccountSessionRepository } from "../repositories/account-session.repository";
import { accountSessions as sessions } from "./account-session.schema";
export class D1AccountSessionRepository implements AccountSessionRepository {
  constructor(private readonly db: Database) {}
  async create(session: AccountSession) {
    await this.db.insert(sessions).values(session).run();
  }
  async find(credentialHash: string) {
    return (
      (await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.credentialHash, credentialHash))
        .get()) ?? null
    );
  }
  async touch(id: string, now: number, idleSeconds: number) {
    const changed = await this.db
      .update(sessions)
      .set({ lastActiveAt: sql`max(${sessions.lastActiveAt}, ${now})` })
      .where(
        and(
          eq(sessions.id, id),
          isNull(sessions.revokedAt),
          gt(sessions.lastActiveAt, now - idleSeconds),
          lte(sessions.createdAt, now),
        ),
      )
      .run();
    return changed.meta.changes > 0;
  }
  async claimRefresh(id: string, version: number, now: number) {
    const changed = await this.db
      .update(sessions)
      .set({ refreshLeaseUntil: now + 30, version: version + 1 })
      .where(
        and(
          eq(sessions.id, id),
          eq(sessions.version, version),
          isNull(sessions.revokedAt),
          lte(sessions.refreshLeaseUntil, now),
        ),
      )
      .run();
    return changed.meta.changes > 0;
  }
  async completeRefresh(
    id: string,
    version: number,
    encryptedTokens: string,
    expiresAt: number,
  ) {
    const changed = await this.db
      .update(sessions)
      .set({
        encryptedTokens,
        providerExpiresAt: expiresAt,
        refreshLeaseUntil: 0,
        version: version + 1,
      })
      .where(
        and(
          eq(sessions.id, id),
          eq(sessions.version, version),
          isNull(sessions.revokedAt),
        ),
      )
      .run();
    return changed.meta.changes > 0;
  }
  async releaseRefresh(id: string, version: number) {
    await this.db
      .update(sessions)
      .set({ refreshLeaseUntil: 0 })
      .where(and(eq(sessions.id, id), eq(sessions.version, version)))
      .run();
  }
  async revoke(id: string, now: number) {
    await this.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.id, id), isNull(sessions.revokedAt)))
      .run();
  }
}
