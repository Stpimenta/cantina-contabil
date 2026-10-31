import "server-only";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1CashBoxRepository } from "@/server/cash-boxes/infrastructure/d1-cash-box.repository";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import { GetHomeUseCase } from "./use-cases/get-home.use-case";
export function createHome() {
  const db = createDatabase();
  return new GetHomeUseCase(
    new D1CashBoxRepository(db),
    new D1EventRepository(db),
  );
}
