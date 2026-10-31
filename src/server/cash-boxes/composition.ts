import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1CashBoxRepository } from "./infrastructure/d1-cash-box.repository";
import { CreateCashBoxUseCase } from "./use-cases/create-cash-box.use-case";
import { ListCashBoxesUseCase } from "./use-cases/list-cash-boxes.use-case";
import { GetCashBoxUseCase } from "./use-cases/get-cash-box.use-case";
import { UpdateCashBoxUseCase } from "./use-cases/update-cash-box.use-case";
import { DeleteCashBoxUseCase } from "./use-cases/delete-cash-box.use-case";
import { ListCashBoxHistoryUseCase } from "./use-cases/list-cash-box-history.use-case";

export function createCashBoxes() {
  const db = createDatabase();
  const repo = new D1CashBoxRepository(db);
  return {
    create: new CreateCashBoxUseCase(repo),
    list: new ListCashBoxesUseCase(repo),
    get: new GetCashBoxUseCase(repo),
    update: new UpdateCashBoxUseCase(repo),
    delete: new DeleteCashBoxUseCase(repo),
    history: new ListCashBoxHistoryUseCase(repo),
  };
}
