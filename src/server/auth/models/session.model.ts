import type { User } from "@/server/users/models/user.model";
import type { Role } from "./role.model";

export interface Session {
  user: User;
  role: Role;
  issuedAt: number;
  expiresAt: number;
}
