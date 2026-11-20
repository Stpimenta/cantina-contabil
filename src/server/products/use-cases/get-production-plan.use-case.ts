import { checkAccess } from "@/shared/auth/check-access";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import { validateEventId, orderPeriodSchema } from "@/server/events/inputs/event-query.input";
import { parseInput } from "@/shared/validation/input";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import type { ProductionPlanItem } from "../models/production-plan.model";

export class GetProductionPlanUseCase {
  constructor(private readonly events: EventRepository, private readonly stock: ProductStockRepository) {}
  async execute(session: Session | null, idInput: unknown, periodInput: unknown): Promise<ProductionPlanItem[]> {
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const period = orderPeriodSchema.parse(periodInput);
    const event = await this.events.find(id);
    if (!event) return eventMissing();
    checkEventRead(session, event);
    const today = currentDateInSaoPaulo();
    const end = new Date(`${today}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + (period === "week" ? (7 - end.getUTCDay()) % 7 : 30));
    const demand = await this.stock.productionDemand(id, period === "all" ? undefined : { from: today, to: end.toISOString().slice(0, 10) });
    const balances = await this.stock.balances(id);
    const products = [...event.products.map((product) => ({ productId: product.id, name: product.name })),
      ...demand.filter((row) => !event.products.some((product) => product.id === row.productId))];
    return products.map((product) => {
      const row = demand.find((item) => item.productId === product.productId);
      const pending = row?.pending ?? 0;
      const available = row?.available ?? balances.find((item) => item.productId === product.productId)?.quantity ?? 0;
      const physical = available + (event.kind === "product_category" ? 0 : row?.allPending ?? 0);
      const toProduce = Math.max(0, pending - physical);
      if (![pending, physical, toProduce].every((value) => Number.isSafeInteger(value) && value >= 0))
        throw new Error("Invalid production plan quantity");
      return { productId: product.productId, name: product.name, pending, physical, toProduce };
    });
  }
}
