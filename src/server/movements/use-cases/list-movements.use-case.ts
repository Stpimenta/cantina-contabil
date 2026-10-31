import type { Session } from "@/server/auth/models/session.model";
import type { MovementRepository } from "../repositories/movement.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import { validateMovementList } from "../inputs/movement.input";
export class ListMovementsUseCase {
  constructor(private readonly movements: MovementRepository) {}
  execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateMovementList(input));
    return this.movements.list(data.page, DEFAULT_PAGE_SIZE);
  }
}
