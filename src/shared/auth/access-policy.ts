import type { Session } from "@/server/auth/models/session.model";
export const isAccessAdmin = (s: Pick<Session, "role">) =>
  ["admin", "root", "tesouraria"].includes(s.role);
export function canReadBox(s: Session, id: string) {
  return (
    isAccessAdmin(s) || (s.role === "finance" && !!s.cashBoxIds?.includes(id))
  );
}
export function canWriteBox(s: Session, id: string) {
  return (
    isAccessAdmin(s) ||
    (s.role === "finance" &&
      !!s.cashBoxIds?.includes(id) &&
      !!s.cashBoxWriteIds?.includes(id))
  );
}
export function canReadEvent(
  s: Session,
  event: { id: string; cashBoxId: string; kind?: string },
) {
  return (
    isAccessAdmin(s) ||
    (s.role === "operator"
      ? !!s.eventIds?.includes(event.id)
      : canReadBox(s, event.cashBoxId))
  );
}
export function canAlterEvent(
  s: Session,
  event: { id: string; cashBoxId: string; kind?: string },
) {
  return (
    isAccessAdmin(s) ||
    (s.role === "operator"
      ? !!s.eventIds?.includes(event.id) &&
        !!s.eventWriteIds?.includes(event.id)
      : canWriteBox(s, event.cashBoxId))
  );
}
