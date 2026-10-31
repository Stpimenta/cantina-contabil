import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import type { Movement } from "../models/movement.model";
import type {
  MovementRepository,
  MovementWrite,
} from "../repositories/movement.repository";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";
import { movements } from "./movement.schema";
export class D1MovementRepository implements MovementRepository {
  constructor(private readonly db: Database) {}

  private async write(
    fn: () => Promise<{ meta: { changes: number } }>,
  ): Promise<MovementWrite> {
    try {
      return (await fn()).meta.changes ? "saved" : "changed";
    } catch (cause) {
      if (hasDatabaseError(cause, "MOVEMENT_INSUFFICIENT_BALANCE"))
        return "insufficient";
      if (hasDatabaseError(cause, "MOVEMENT_AMOUNT_LIMIT")) return "limit";
      if (hasDatabaseError(cause, "MOVEMENT_BOX_UNAVAILABLE"))
        return "box_unavailable";
      if (hasDatabaseError(cause, "MOVEMENT_CHANGED")) return "changed";
      throw cause;
    }
  }
  async options() {
    return this.db
      .select({ id: cashBoxes.id, name: cashBoxes.name })
      .from(cashBoxes)
      .where(isNull(cashBoxes.deletedAt))
      .orderBy(cashBoxes.name)
      .all();
  }
  async find(id: string) {
    return (
      (await this.db
        .select()
        .from(movements)
        .where(eq(movements.id, id))
        .get()) ?? null
    );
  }
  async list(page: number, pageSize: number) {
    const condition = isNull(movements.deletedAt);
    const total =
      (
        await this.db
          .select({ total: count() })
          .from(movements)
          .where(condition)
          .get()
      )?.total ?? 0;
    const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const items = await this.db
      .select()
      .from(movements)
      .where(condition)
      .orderBy(
        desc(movements.occurredOn),
        desc(movements.createdAt),
        desc(movements.id),
      )
      .limit(pageSize)
      .offset((current - 1) * pageSize)
      .all();
    return { items, total, page: current, pageSize };
  }
  create(value: Movement) {
    return this.write(() =>
      this.db
        .insert(movements)
        .values(value)
        .onConflictDoNothing({ target: movements.id })
        .run(),
    );
  }
  update(value: Movement, expectedVersion: number) {
    const { id, createdAt, createdBy, createdByName, fingerprint, ...changes } =
      value;
    return this.write(() =>
      this.db
        .update(movements)
        .set(changes)
        .where(
          and(
            eq(movements.id, id),
            eq(movements.version, expectedVersion),
            isNull(movements.deletedAt),
          ),
        )
        .run(),
    );
  }
}
