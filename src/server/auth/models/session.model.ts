import type { User } from "@/server/users/models/user.model";
import type { Role } from "./role.model";

export interface Session {
  accountId?: number;
  accountSessionId?: string;
  cashBoxIds?: string[];
  cashBoxWriteIds?: string[];
  eventIds?: string[];
  eventWriteIds?: string[];
  eventCashBoxIds?: string[];
  user: User;
  role: Role;
  issuedAt: number;
  expiresAt: number;
}
