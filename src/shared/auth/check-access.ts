import { throwBusinessError } from "@/shared/errors/business-error";
import type { Session } from "@/server/auth/models/session.model";
import { isAllowedRole } from "@/server/auth/models/role.model";
export function checkAccess(session: Session | null) {
  if (!session || session.expiresAt <= Math.floor(Date.now() / 1000))
    return throwBusinessError({
      code: "SESSION_EXPIRED",
      category: "unauthenticated",
    });
  if (!isAllowedRole(session.role))
    return throwBusinessError({
      code: "ACCESS_DENIED",
      category: "forbidden",
    });
  return session;
}
