import type { UserRepository } from "../repositories/user.repository";
export class GetOwnProfileUseCase {
  constructor(private readonly users: UserRepository) {}
  execute(userId: number, token: string) {
    return this.users.findOwnProfile(userId, token);
  }
}
