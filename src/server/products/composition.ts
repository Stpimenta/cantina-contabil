import { LoadStockImportOptionsUseCase } from "./use-cases/load-stock-import-options.use-case";
import { D1SharedStockRepository } from "./infrastructure/d1-shared-stock.repository";
import { LoadSharedStockUseCase } from "./use-cases/load-shared-stock.use-case";
import { ManageSharedStockUseCase } from "./use-cases/manage-shared-stock.use-case";
import { LoadStockHistoryUseCase } from "./use-cases/load-stock-history.use-case";
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
export function createProducts() {
  const db = createDatabase();
  const events = new D1EventRepository(db);
  const stock = new D1ProductStockRepository(db);
  const shared = new D1SharedStockRepository(db);
  const saveEntry = new SaveStockEntryUseCase(events, stock, shared);
  return {
    importOptions: new LoadStockImportOptionsUseCase(events, shared),
    shared: new LoadSharedStockUseCase(events, shared),
    manageShared: new ManageSharedStockUseCase(events, shared),
    stockHistory: new LoadStockHistoryUseCase(events, shared),
    productionPlan: new GetProductionPlanUseCase(events, stock),
    loadEntries: new LoadStockEntriesUseCase(events, stock, shared),
    checkRemoval: new CheckProductRemovalUseCase(events, stock),
    list: new ListProductCategoriesUseCase(events),
    stock: new GetProductStockUseCase(events, stock),
    entries: new ListStockEntriesUseCase(events, stock, shared),
    saveEntry,
    updateEntries: new UpdateStockEntriesUseCase(events, stock, shared),
    deleteEntry: new DeleteStockEntryUseCase(events, stock, shared),
    withdrawal: new SaveOrderWithdrawalUseCase(events, stock, shared),
  };
}
