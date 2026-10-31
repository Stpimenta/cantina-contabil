import { validateListCashBoxHistory } from "../inputs/list-cash-box-history.input";
import { parseInput } from "@/shared/validation/input";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import type { CashBoxHistoryCategory } from "../models/cash-box-history-entry.model";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { CashBoxRepository } from "../repositories/cash-box.repository";
import { cashBoxMissing } from "../models/cash-box-rules";
export class ListCashBoxHistoryUseCase {
  constructor(private readonly boxes: CashBoxRepository) {}
  async execute(
    session: Session | null,
    id: string,
    page = 1,
    category: CashBoxHistoryCategory = "all",
  ) {
    checkAccess(session);
    const filters = parseInput(
      validateListCashBoxHistory({ id, page, category }),
    );
    if (!(await this.boxes.find(filters.id))) return cashBoxMissing();
    return await this.boxes.history(
      filters.id,
      filters.page,
      DEFAULT_PAGE_SIZE,
      filters.category,
    );
  }
}
