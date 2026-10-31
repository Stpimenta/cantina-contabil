import "server-only";
import { R2ReceiptRepository } from "@/server/events/infrastructure/r2-receipt.repository";
import { GetMovementReceiptUseCase } from "./use-cases/get-movement-receipt.use-case";
import { GetMovementOptionsUseCase } from "./use-cases/get-movement-options.use-case";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1CashBoxRepository } from "@/server/cash-boxes/infrastructure/d1-cash-box.repository";
import { D1MovementRepository } from "./infrastructure/d1-movement.repository";
import { CreateMovementUseCase } from "./use-cases/create-movement.use-case";
import { UpdateMovementUseCase } from "./use-cases/update-movement.use-case";
import { DeleteMovementUseCase } from "./use-cases/delete-movement.use-case";
import { ListMovementsUseCase } from "./use-cases/list-movements.use-case";
export function createMovements() {
  const db = createDatabase();
  const repository = new D1MovementRepository(db);
  const receipts = new R2ReceiptRepository();
  const boxes = new D1CashBoxRepository(db);
  return {
    receipt: new GetMovementReceiptUseCase(repository, receipts),
    options: new GetMovementOptionsUseCase(repository),
    create: new CreateMovementUseCase(repository, boxes, receipts),
    update: new UpdateMovementUseCase(repository, boxes, receipts),
    delete: new DeleteMovementUseCase(repository, boxes),
    list: new ListMovementsUseCase(repository),
  };
}
