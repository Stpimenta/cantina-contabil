import { checkStockMembers } from "./shared-stock-access";
import { checkAccess } from "@/shared/auth/check-access";
import { checkEventRead } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { eventMissing } from "@/server/events/models/event-rules";
import {
  validateEventId,
  orderPeriodSchema,
} from "@/server/events/inputs/event-query.input";
import { parseInput } from "@/shared/validation/input";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
import type { ProductStockRepository } from "../repositories/product-stock.repository";
import type { ProductionPlanItem } from "../models/production-plan.model";

export class GetProductionPlanUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly stock: ProductStockRepository,
  ) {}
  async execute(
    session: Session | null,
    idInput: unknown,
    periodInput: unknown,
  ): Promise<ProductionPlanItem[]> {
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const period = orderPeriodSchema.parse(periodInput);
    const event = await this.events.find(id);
    if (!event) return eventMissing();
    checkEventRead(session, event);
    const today = currentDateInSaoPaulo();
    const end = new Date(`${today}T12:00:00Z`);
    end.setUTCDate(
      end.getUTCDate() + (period === "week" ? (7 - end.getUTCDay()) % 7 : 30),
    );
    const range =
      period === "all"
        ? undefined
        : { from: today, to: end.toISOString().slice(0, 10) };
    const positions = await this.stock.positions(id, range);
    checkStockMembers(session, positions, false);
    const products = positions.filter((p) => p.eventId === id);
    const seen = new Set<string>();
    return products.flatMap<ProductionPlanItem>((product) => {
      const linked = positions.filter((p) => p.stockId === product.stockId);
      if (linked.length > 1) {
        if (seen.has(product.stockId)) return [];
        seen.add(product.stockId);
        const individual = linked.map((m) => {
          const pending = m.pending;
          return {
            value: `${m.eventId}:${m.productId}`,
            label: `${m.productName} — ${m.categoryName}`,
            pending,
            physical: m.quantity,
            toProduce: Math.max(0, pending - m.quantity),
          };
        });
        const pending = individual.reduce((sum, item) => sum + item.pending, 0),
          physical = product.quantity;
        const toProduce = Math.max(0, pending - physical);
        if (
          ![pending, physical, toProduce].every(
            (v) => Number.isSafeInteger(v) && v >= 0,
          )
        )
          throw new Error("Invalid shared production quantity");
        return [
          {
            productId: product.productId,
            name: product.productName,
            pending,
            physical,
            toProduce,
            scenarios: [
              {
                value: "all",
                label: "Consolidado",
                pending,
                physical,
                toProduce,
              },
              ...individual,
            ],
          },
        ];
      }
      const pending = product.pending;
      const physical = product.quantity;
      const toProduce = Math.max(0, pending - physical);
      if (
        ![pending, physical, toProduce].every(
          (value) => Number.isSafeInteger(value) && value >= 0,
        )
      )
        throw new Error("Invalid production plan quantity");
      return [
        {
          productId: product.productId,
          name: product.productName,
          pending,
          physical,
          toProduce,
        },
      ];
    });
  }
}
