import { UpdateSupplyUseCase } from "./use-cases/update-supply.use-case";
import { DeleteSupplyUseCase } from "./use-cases/delete-supply.use-case";
import "server-only";
import { D1EventSupplyRepository } from "./infrastructure/d1-event-supply.repository";
import { R2ReceiptRepository } from "./infrastructure/r2-receipt.repository";
import { CreateSupplyUseCase } from "./use-cases/create-supply.use-case";
import { ListSuppliesUseCase } from "./use-cases/list-supplies.use-case";
import { ReceiveSupplyUseCase } from "./use-cases/receive-supply.use-case";
import { GetSupplyReceiptUseCase } from "./use-cases/get-supply-receipt.use-case";
import { DeleteOrderUseCase } from "./use-cases/delete-order.use-case";
import { DeleteEventUseCase } from "./use-cases/delete-event.use-case";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1EventRepository } from "./infrastructure/d1-event.repository";
import { D1CashBoxRepository } from "@/server/cash-boxes/infrastructure/d1-cash-box.repository";
import { CreateEventUseCase } from "./use-cases/create-event.use-case";
import { UpdateEventUseCase } from "./use-cases/update-event.use-case";
import { CreateOrderUseCase } from "./use-cases/create-order.use-case";
import { UpdateOrderUseCase } from "./use-cases/update-order.use-case";
import { ListEventsUseCase } from "./use-cases/list-events.use-case";
import { GetEventUseCase } from "./use-cases/get-event.use-case";
import { ListOrdersUseCase } from "./use-cases/list-orders.use-case";
import { ListEventHistoryUseCase } from "./use-cases/list-event-history.use-case";
import { GetEventBoxesUseCase } from "./use-cases/get-event-boxes.use-case";
export function createEvents() {
  const db = createDatabase();
  const repo = new D1EventRepository(db);
  const boxes = new D1CashBoxRepository(db);
  const supplies = new D1EventSupplyRepository(db);
  const receipts = new R2ReceiptRepository();
  return {
    updateSupply: new UpdateSupplyUseCase(supplies, repo, boxes, receipts),
    deleteSupply: new DeleteSupplyUseCase(supplies, repo),
    supplies: new ListSuppliesUseCase(supplies, repo),
    createSupply: new CreateSupplyUseCase(supplies, repo, boxes, receipts),
    receiveSupply: new ReceiveSupplyUseCase(supplies, repo),
    receipt: new GetSupplyReceiptUseCase(supplies, repo, receipts),
    delete: new DeleteEventUseCase(repo),
    deleteOrder: new DeleteOrderUseCase(repo),
    boxes: new GetEventBoxesUseCase(repo),
    create: new CreateEventUseCase(repo, boxes),
    update: new UpdateEventUseCase(repo, boxes),
    createOrder: new CreateOrderUseCase(repo),
    updateOrder: new UpdateOrderUseCase(repo),
    list: new ListEventsUseCase(repo),
    get: new GetEventUseCase(repo),
    orders: new ListOrdersUseCase(repo),
    history: new ListEventHistoryUseCase(repo),
  };
}
