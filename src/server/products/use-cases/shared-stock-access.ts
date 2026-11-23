import type { Session } from "@/server/auth/models/session.model";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import {
  checkEventRead,
  checkEventAccessWrite,
} from "@/shared/auth/check-cash-box-access";
import { stockContext, type StockMember } from "../models/shared-stock.model";
export function checkStockMembers(
  session: Session | null,
  members: StockMember[],
  write: boolean,
) {
  for (const member of members) {
    const event = {
      id: member.eventId,
      cashBoxId: member.cashBoxId,
      kind: "product_category",
    };
    if (write) checkEventAccessWrite(session, event);
    else checkEventRead(session, event);
  }
  return stockContext(members);
}
export async function sharedStockAccess(
  session: Session | null,
  shared: SharedStockRepository | undefined,
  categoryId: string,
  productIds: string[],
  write: boolean,
) {
  const members = shared ? await shared.members(categoryId, productIds) : [];
  return {
    members,
    context: members.length
      ? checkStockMembers(session, members, write)
      : undefined,
  };
}
