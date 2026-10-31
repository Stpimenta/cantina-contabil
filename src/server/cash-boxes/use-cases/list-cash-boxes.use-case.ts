import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { CashBoxRepository } from "../repositories/cash-box.repository";
import { validateListCashBoxes } from "../inputs/list-cash-boxes.input";
import { parseInput } from "@/shared/validation/input";
export class ListCashBoxesUseCase {
  constructor(private readonly boxes: CashBoxRepository) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const filters = parseInput(validateListCashBoxes(input));
    return await this.boxes.list(
      filters.query,
      filters.page,
      DEFAULT_PAGE_SIZE,
    );
  }
}
