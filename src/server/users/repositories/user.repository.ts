import type { User } from "../models/user.model";

export interface UserRepository {
  findOwnProfile(id: number, token: string): Promise<User>;
}
