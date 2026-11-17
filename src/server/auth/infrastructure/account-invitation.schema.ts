import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const accountInvitations = sqliteTable("account_invitations", {
  id: text("id").primaryKey().notNull(),
  accountId: integer("account_id").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdBy: integer("created_by").notNull(),
  cancelledAt: integer("cancelled_at"),
  consumedAt: integer("consumed_at"),
});
