import { events } from "@/server/events/infrastructure/event.schema";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import type { LocalAccount } from "../models/local-account.model";
import type {
  ImportedAccountInput,
  LocalAccountRepository,
} from "../repositories/local-account.repository";
import { localAccounts } from "./local-account.schema";
import { localAccountCashBoxes } from "./local-account-cash-box.schema";

export class D1LocalAccountRepository implements LocalAccountRepository {
  constructor(private readonly db: Database) {}

  async eventOptions() {
    return this.db
      .select({ id: events.id, name: events.name })
      .from(events)
      .where(isNull(events.deletedAt))
      .orderBy(asc(events.name), asc(events.id))
      .all();
  }

  async list(query: string, page: number, pageSize: number) {
    const search = `%${query.replace(/[!%_]/g, "!$&")}%`,
      where = query
        ? sql`(${localAccounts.name} LIKE ${search} ESCAPE '!' OR ${localAccounts.email} LIKE ${search} ESCAPE '!')`
        : undefined;
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(localAccounts)
          .where(where)
          .get()
      )?.total ?? 0;
    const normalized = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await this.db
      .select()
      .from(localAccounts)
      .where(where)
      .orderBy(asc(localAccounts.name), asc(localAccounts.id))
      .limit(pageSize)
      .offset((normalized - 1) * pageSize);
    return {
      items: await Promise.all(rows.map((row) => this.read(row))),
      total,
      page: normalized,
    };
  }
  async manage(
    data: {
      id: number;
      version: number;
      role: "admin" | "finance" | "operator";
      blocked: boolean;
      cashBoxIds: string[];
      cashBoxWriteIds?: string[];
      eventIds?: string[];
      eventWriteIds?: string[];
    },
    actorId: number,
    at: string,
  ) {
    try {
      const result = await this.db
        .update(localAccounts)
        .set({
          role: data.role === "admin" ? "admin" : "operator",
          accessRole: data.role,
          accessJson: JSON.stringify({
            cashBoxWriteIds: data.cashBoxWriteIds ?? [],
            eventIds: data.eventIds ?? [],
            eventWriteIds: data.eventWriteIds ?? [],
          }),
          state: data.blocked
            ? "blocked"
            : sql`CASE WHEN ${localAccounts.activatedAt} IS NULL THEN 'pending' ELSE 'active' END`,
          cashBoxIdsJson: JSON.stringify(
            data.role === "admin" ? [] : data.cashBoxIds,
          ),
          version: data.version + 1,
          changedBy: actorId,
          updatedAt: at,
        })
        .where(
          and(
            eq(localAccounts.id, data.id),
            eq(localAccounts.version, data.version),
          ),
        )
        .run();
      return result.meta.changes > 0;
    } catch (cause) {
      if (hasDatabaseError(cause, "ACCOUNT_SCOPE_INVALID")) return false;
      throw cause;
    }
  }

  async findByEmail(email: string) {
    const row = await this.db
      .select()
      .from(localAccounts)
      .where(eq(localAccounts.emailKey, email.trim().toLowerCase()))
      .get();
    return row ? this.read(row) : null;
  }
  async bindSubject(id: number, subject: string) {
    const result = await this.db
      .update(localAccounts)
      .set({ authSubject: subject })
      .where(
        and(
          eq(localAccounts.id, id),
          eq(localAccounts.state, "pending"),
          or(
            isNull(localAccounts.authSubject),
            eq(localAccounts.authSubject, subject),
          ),
        ),
      )
      .run();
    return result.meta.changes > 0;
  }
  async reserveInvited(name: string, email: string, now: string) {
    const rows = await this.db
      .insert(localAccounts)
      .values({
        name,
        email,
        emailKey: email.trim().toLowerCase(),
        role: "operator",
        accessRole: "operator",
        state: "pending",
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
    return rows[0] ? this.read(rows[0]) : null;
  }

  async findById(id: number) {
    const row = await this.db
      .select()
      .from(localAccounts)
      .where(eq(localAccounts.id, id))
      .get();
    return row ? this.read(row) : null;
  }

  async findBySubject(subject: string) {
    const row = await this.db
      .select()
      .from(localAccounts)
      .where(eq(localAccounts.authSubject, subject))
      .get();
    return row ? this.read(row) : null;
  }

  async findByExternalUserId(externalUserId: number) {
    const row = await this.db
      .select()
      .from(localAccounts)
      .where(eq(localAccounts.externalUserId, externalUserId))
      .get();
    return row ? this.read(row) : null;
  }

  async reserveImported(input: ImportedAccountInput) {
    // Never update an existing account from GestPV: it must not undo blocking,
    // change local roles/grants or replace a previously bound identity.
    await this.db
      .insert(localAccounts)
      .values({
        externalUserId: input.externalUserId,
        birthDate: input.birthDate,
        phoneCountry: input.phoneCountry,
        phoneNumber: input.phoneNumber,
        name: input.name,
        email: input.email,
        emailKey: input.email.trim().toLowerCase(),
        role: "admin",
        accessRole: "admin",
        state: "pending",
        version: 1,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoNothing()
      .run();
    // An email collision never binds or merges a different external identity.
    return this.findByExternalUserId(input.externalUserId);
  }

  private async read(
    row: typeof localAccounts.$inferSelect,
  ): Promise<LocalAccount> {
    const grants = await this.db
      .select({ id: localAccountCashBoxes.cashBoxId })
      .from(localAccountCashBoxes)
      .where(eq(localAccountCashBoxes.accountId, row.id))
      .orderBy(asc(localAccountCashBoxes.cashBoxId));
    const permissions = JSON.parse(row.accessJson) as { eventIds: string[] };
    const eventBoxes = await this.db
      .select({ id: events.cashBoxId })
      .from(events)
      .where(
        and(
          isNull(events.deletedAt),
          sql`${events.id} IN (SELECT value FROM json_each(${JSON.stringify(permissions.eventIds)}))`,
        ),
      )
      .all();
    return {
      eventCashBoxIds: [...new Set(eventBoxes.map((e) => e.id))],
      id: row.id,
      authorId: row.externalUserId ?? -row.id,
      birthDate: row.birthDate,
      phoneCountry: row.phoneCountry,
      phoneNumber: row.phoneNumber,
      externalUserId: row.externalUserId,
      authSubject: row.authSubject,
      name: row.name,
      email: row.email,
      role: row.accessRole ?? row.role,
      ...JSON.parse(row.accessJson),
      state: row.state,
      version: row.version,
      cashBoxIds: grants.map((grant) => grant.id),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
