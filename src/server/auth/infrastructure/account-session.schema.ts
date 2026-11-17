import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { localAccounts } from "@/server/users/infrastructure/local-account.schema";
export const accountSessions = sqliteTable("account_sessions", {
  id: text("id").notNull().primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => localAccounts.id),
  credentialHash: text("credential_hash").notNull(),
  encryptedTokens: text("encrypted_tokens").notNull(),
  providerExpiresAt: integer("provider_expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  lastActiveAt: integer("last_active_at").notNull(),
  refreshLeaseUntil: integer("refresh_lease_until").notNull(),
  version: integer("version").notNull(),
  revokedAt: integer("revoked_at"),
});
