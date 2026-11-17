import type { Movement } from "../models/movement.model";
export type MovementWrite =
  "saved" | "changed" | "insufficient" | "limit" | "box_unavailable";
export interface MovementRepository {
  options(allowedIds?: string[]): Promise<{ id: string; name: string }[]>;
  find(id: string): Promise<Movement | null>;
  list(
    page: number,
    pageSize: number,
    allowedIds?: string[],
  ): Promise<{
    items: Movement[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  create(value: Movement): Promise<MovementWrite>;
  update(value: Movement, expectedVersion: number): Promise<MovementWrite>;
}
