import type { LocalAccount } from "@/server/users/models/local-account.model";
import { throwBusinessError } from "@/shared/errors/business-error";

export const ACCOUNT_IDLE_SECONDS = 12 * 60 * 60;
export const ACCOUNT_INVITATION_SECONDS = 72 * 60 * 60;

export function requireActiveAccount(
  account: LocalAccount | null,
): LocalAccount {
  if (!account || account.state !== "active")
    return throwBusinessError({ code: "ACCESS_DENIED", category: "forbidden" });
  return account;
}

export function requireAccountAdmin(
  account: LocalAccount | null,
): LocalAccount {
  const active = requireActiveAccount(account);
  if (active.role !== "admin")
    return throwBusinessError({ code: "ACCESS_DENIED", category: "forbidden" });
  return active;
}

export function canWriteAccountCashBox(
  account: LocalAccount,
  cashBoxId: string,
): boolean {
  return (
    account.state === "active" &&
    (account.role === "admin" ||
      (account.role === "finance" &&
        account.cashBoxIds.includes(cashBoxId) &&
        !!account.cashBoxWriteIds?.includes(cashBoxId)))
  );
}
