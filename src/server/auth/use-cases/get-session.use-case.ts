import type { SessionRepository } from "../repositories/session.repository";
import { isAllowedRole } from "../models/role.model";
export class GetSessionUseCase {
  constructor(private readonly sessions: SessionRepository) {}
  async execute() {
    const session = await this.sessions.read();
    return session &&
      isAllowedRole(session.role) &&
      session.expiresAt > Math.floor(Date.now() / 1000)
      ? session
      : null;
  }
}
