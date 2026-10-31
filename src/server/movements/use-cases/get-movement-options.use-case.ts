import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { MovementRepository } from "../repositories/movement.repository";
export class GetMovementOptionsUseCase {
  constructor(private readonly movements: MovementRepository) {}
  execute(session: Session | null) {
    checkAccess(session);
    return this.movements.options();
  }
}
