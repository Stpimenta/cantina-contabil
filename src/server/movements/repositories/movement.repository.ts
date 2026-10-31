import type { Movement } from "../models/movement.model";
export type MovementWrite =
  "saved" | "changed" | "insufficient" | "limit" | "box_unavailable";
export interface MovementRepository {
  options(): Promise<{ id: string; name: string }[]>;
  find(id: string): Promise<Movement | null>;
  list(
    page: number,
    pageSize: number,
  ): Promise<{
    items: Movement[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  create(value: Movement): Promise<MovementWrite>;
  update(value: Movement, expectedVersion: number): Promise<MovementWrite>;
}
