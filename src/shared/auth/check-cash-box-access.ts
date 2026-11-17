import { checkAccess } from "./check-access";
import {
  canReadBox,
  canWriteBox,
  canReadEvent,
  canAlterEvent,
  isAccessAdmin,
} from "./access-policy";
import type { Session } from "@/server/auth/models/session.model";
import { throwBusinessError } from "@/shared/errors/business-error";
const denied = () =>
  throwBusinessError({ code: "ACCESS_DENIED", category: "forbidden" });
export function cashBoxReadScope(session: Session | null) {
  const s = checkAccess(session);
  if (s.role === "operator") return denied();
  return isAccessAdmin(s) ? undefined : (s.cashBoxIds ?? []);
}
export function checkCashBoxRead(session: Session | null, id: string) {
  const s = checkAccess(session);
  if (!canReadBox(s, id)) return denied();
  return s;
}
export function checkCashBoxWrite(
  session: Session | null,
  ...ids: (string | null | undefined)[]
) {
  const s = checkAccess(session);
  if (
    !isAccessAdmin(s) &&
    (s.role !== "finance" ||
      !ids.filter(Boolean).length ||
      ids.some((id) => id && !canWriteBox(s, id)))
  )
    return denied();
  return s;
}
export function checkAdminAccess(session: Session | null) {
  const s = checkAccess(session);
  if (!isAccessAdmin(s)) return denied();
  return s;
}
export function checkEventRead(
  session: Session | null,
  event: { id: string; cashBoxId: string },
) {
  const s = checkAccess(session);
  if (!canReadEvent(s, event)) return denied();
  return s;
}
export function checkEventAccessWrite(
  session: Session | null,
  event: { id: string; cashBoxId: string },
  ...payerIds: (string | null | undefined)[]
) {
  const s = checkAccess(session);
  if (
    !canAlterEvent(s, event) ||
    payerIds.some(
      (id) =>
        id &&
        (s.role === "operator" ? id !== event.cashBoxId : !canWriteBox(s, id)),
    )
  )
    return denied();
  return s;
}
export function eventReadScope(session: Session | null) {
  const s = checkAccess(session);
  return isAccessAdmin(s)
    ? undefined
    : s.role === "operator"
      ? { eventIds: s.eventIds ?? [] }
      : { cashBoxIds: s.cashBoxIds ?? [] };
}
