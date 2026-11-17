import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { localAccounts } from "./local-account.schema";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";

export const localAccountCashBoxes = sqliteTable("local_account_cash_boxes", {
  accountId: integer("account_id")
    .notNull()
    .references(() => localAccounts.id),
  cashBoxId: text("cash_box_id")
    .notNull()
    .references(() => cashBoxes.id),
});
