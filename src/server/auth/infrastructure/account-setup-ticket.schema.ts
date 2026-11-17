import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const accountSetupTickets = sqliteTable("account_setup_tickets", {
  credentialHash: text("credential_hash").primaryKey().notNull(),
  accountId: integer("account_id").notNull(),
  invitationId: text("invitation_id"),
  purpose: text("purpose").$type<"invite" | "recovery">().notNull(),
  encryptedTokens: text("encrypted_tokens").notNull(),
  expiresAt: integer("expires_at").notNull(),
  consumedAt: integer("consumed_at"),
});
