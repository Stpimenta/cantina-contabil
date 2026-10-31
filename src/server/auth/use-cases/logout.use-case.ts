import type { SessionRepository } from "../repositories/session.repository";
export class LogoutUseCase {
  constructor(private readonly sessions: SessionRepository) {}
  async execute() {
    await this.sessions.destroy();
  }
}
