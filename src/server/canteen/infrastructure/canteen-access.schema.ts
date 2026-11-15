import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { events } from "@/server/events/infrastructure/event.schema";
export const canteenAccess = sqliteTable("canteen_access", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  name: text("name").notNull(),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
  linkHash: text("link_hash").notNull().unique(),
  sessionHash: text("session_hash").unique(),
  activatedAt: integer("activated_at"),
  revocationOperation: text("revocation_operation"),
});
