"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Session } from "@/server/auth/models/session.model";
import {
  isAccessAdmin,
  canWriteBox,
  canAlterEvent,
} from "@/shared/auth/access-policy";
const Access = createContext<Session | null>(null);
export function CashBoxAccessProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  return <Access.Provider value={session}>{children}</Access.Provider>;
}
export function useCashBoxAccess() {
  const access = useContext(Access);
  return {
    isAdmin: !!access && isAccessAdmin(access),
    isOperator: access?.role === "operator",
    canWrite: (...ids: (string | null | undefined)[]) =>
      !!access &&
      (isAccessAdmin(access) ||
        (ids.some(Boolean) &&
          ids.every((id) => !id || canWriteBox(access, id)))),
    canWriteEvent: (
      event: { id: string; cashBoxId: string; kind?: string },
      ...payers: (string | null | undefined)[]
    ) =>
      !!access &&
      canAlterEvent(access, event) &&
      payers.every(
        (id) =>
          !id ||
          (access.role === "operator"
            ? id === event.cashBoxId
            : canWriteBox(access, id)),
      ),
  };
}
