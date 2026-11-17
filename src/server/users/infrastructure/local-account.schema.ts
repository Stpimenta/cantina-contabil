import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  LocalAccountRole,
  LocalAccountState,
} from "../models/local-account.model";

export const localAccounts = sqliteTable("local_accounts", {
  birthDate: text("birth_date"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"),
  activatedAt: text("activated_at"),
  cashBoxIdsJson: text("cash_box_ids_json").notNull().default("[]"),
  changedBy: integer("changed_by"),
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalUserId: integer("external_user_id"),
  authSubject: text("auth_subject"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailKey: text("email_key").notNull(),
  role: text("role").$type<"admin" | "operator">().notNull(),
  accessRole: text("access_role").$type<LocalAccountRole>(),
  accessJson: text("access_json")
    .notNull()
    .default('{"cashBoxWriteIds":[],"eventIds":[],"eventWriteIds":[]}'),
  state: text("state").$type<LocalAccountState>().notNull(),
  version: integer("version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
