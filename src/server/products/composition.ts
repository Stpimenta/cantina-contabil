import { GetProductionPlanUseCase } from "./use-cases/get-production-plan.use-case";
import { LoadStockEntriesUseCase } from "./use-cases/load-stock-entries.use-case";
import { CheckProductRemovalUseCase } from "./use-cases/check-product-removal.use-case";
import { UpdateStockEntriesUseCase } from "./use-cases/update-stock-entries.use-case";
import { DeleteStockEntryUseCase } from "./use-cases/delete-stock-entry.use-case";
import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import { D1ProductStockRepository } from "./infrastructure/d1-product-stock.repository";
import { ListProductCategoriesUseCase } from "./use-cases/list-product-categories.use-case";
import { GetProductStockUseCase } from "./use-cases/get-product-stock.use-case";
import { ListStockEntriesUseCase } from "./use-cases/list-stock-entries.use-case";
import { SaveStockEntryUseCase } from "./use-cases/save-stock-entry.use-case";
import { SaveOrderWithdrawalUseCase } from "./use-cases/save-order-withdrawal.use-case";
import { ResolveOrderStockShortageUseCase } from "./use-cases/resolve-order-stock-shortage.use-case";
export function createProducts() {
  const db = createDatabase();
  const events = new D1EventRepository(db);
  const stock = new D1ProductStockRepository(db);
  const saveEntry = new SaveStockEntryUseCase(events, stock);
  return {
    productionPlan: new GetProductionPlanUseCase(events, stock),
    resolveShortage: new ResolveOrderStockShortageUseCase(
      events,
      stock,
      saveEntry,
    ),
    loadEntries: new LoadStockEntriesUseCase(events, stock),
    checkRemoval: new CheckProductRemovalUseCase(events, stock),
    list: new ListProductCategoriesUseCase(events),
    stock: new GetProductStockUseCase(events, stock),
    entries: new ListStockEntriesUseCase(events, stock),
    saveEntry,
    updateEntries: new UpdateStockEntriesUseCase(events, stock),
    deleteEntry: new DeleteStockEntryUseCase(events, stock),
    withdrawal: new SaveOrderWithdrawalUseCase(events, stock),
  };
}
